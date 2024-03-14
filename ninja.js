const { getTickets } = require('./database');
const { db } = require('./database')

// Get access_token from refresh_token and send to NinjaAuth to keep the webhook open
// Interval set to run this function 'almost' every hour (3599999 milliseconds)
async function getAccess() {
    console.log('Fetching access token')

    const auth = 'https://jakesweeney.rmmservice.com/ws/oauth/token';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: 'xxxxxx',
            refresh_token: 'xxxxxx'
        })
    };
    const response = await fetch(auth, options);
    const data = await response.json();

    console.log('Status ' + response.status)
    if (response.status == 200) {
        console.log('Successful access token fetch')
    } else (
        console.log('Failed to fetch access token')
    )

    return data.access_token;
}
exports.getAccess = getAccess;

// Configure webhook, will run with getAccess to keep the webhook configuration open
async function ticketStatus(token) {
    const ticketData = await getTickets();
    

    for (let i = 0; i < ticketData.length; i++) {
        let id = ticketData[i].ticketNo;
        const idEndpoint = 'https://jakesweeney.rmmservice.com/v2/ticketing/ticket/' + id;
        // Webhook setup using fetch
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
            },
        };

        // Show status code or error from response 
        const response = await fetch(idEndpoint, options);
        const data = await response.json();

        let statusObject = {
            'id': data.id,
            'status': data.status.name
        };

        let selectSql = "SELECT status FROM tickets WHERE ticketNo = '" + statusObject.id + "'"
        let setSql = "UPDATE tickets SET status = '" + statusObject.status + "' WHERE ticketNo = '" + statusObject.id + "'"
        let deleteSql = "DELETE FROM tickets WHERE ticketNo = '" + statusObject.id  + "'"
        var status = await new Promise((resolve, reject) => {
            db.get(selectSql, (err, rows) => {
                if(err){
                    reject()
                } else {
                    resolve(rows.status); 
                }
            });
        });

        if (status !== statusObject.status) {
            console.log('Setting ticket ' + statusObject.id + ' to ' + statusObject.status)
            db.run(setSql)
        } else if (status == 'RESOLVED') {
            console.log('Ticket ' + statusObject.id + ' has been resolved')
            db.run(deleteSql)
        }

    }
}
exports.ticketStatus = ticketStatus
