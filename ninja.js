/* 
    Ninja.js
    Houses methods for getting access tokens and getting statuses of tickets at the 
    API endpoint. 
*/


const { db, getTickets, getStatus } = require('./database');

const clientId = process.argv[2]
const refreshToken = process.argv[3]

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
        // Enter client id and refresh token as arguments to start 
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: `${clientId}`,
            refresh_token: `${refreshToken}`
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
    
    // Returns access token
    return data.access_token;
}
exports.getAccess = getAccess;

// Uses ticket id sent from ShamRock-it to consistently fetch the ticket JSON data
// If the status changes it is updated in the database
async function ticketStatus(token) {
    // Get all current tickets in the database 
    // Given as an array of objects
    // The only key in this object and the only one being used is ticketNo
    const ticketData = await getTickets();
    
    // Iterate through the array of objects
    for (let i = 0; i < ticketData.length; i++) {
        // Set ID from ticketNo column 
        let id = ticketData[i].ticketNo;
        const idEndpoint = 'https://jakesweeney.rmmservice.com/v2/ticketing/ticket/' + id;
        // Endpoint request setup
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
            },
        };

        // Fetch Ninja Ticket data 
        const response = await fetch(idEndpoint, options);
        const statusCode = await response.status; 
        const data = await response.json();

        if (statusCode === 200) {
            // Create new object that holds just the ID and the status from the returned data
            let statusObject = {
                'id': data.id,
                'status': data.status.name
            };

            let setSql = "UPDATE tickets SET status = '" + statusObject.status + "' WHERE ticketNo = '" + statusObject.id + "'"
            let deleteSql = "DELETE FROM tickets WHERE ticketNo = '" + statusObject.id  + "'"

            // Select ticket from table and set its status as variable status 
            var status = await getStatus(statusObject.id); 

            // statusObject and status are separate sets of data. 
            // statusObject gets the ticket data from Ninja and will be the most up to date
            // status is what is found in the table from the database and is what will be manipulated
            if (await status !== statusObject.status) {
                // If they are not the same the table will be updated with the statusObject values
                console.log('Setting ticket ' + statusObject.id + ' to ' + statusObject.status)
                db.run(setSql) // Command to set the value in the table
            } else if (await status == 'CLOSED') {
                // If they are not the same and the status is CLOSED, delete the ticket from the table
                // This is so it is no longer displayed on the TV app that uses this data
                console.log('Ticket ' + statusObject.id + ' has been closed')
                db.run(deleteSql)
            }

        } else {
            console.log('Ticket ' + id + ' does not exist, deleting')
            let deleteSql = "DELETE FROM tickets WHERE ticketNo = '" + id  + "'"
            db.run(deleteSql)
            console.log('Deleted ticket ' + id)
        }
    }
}
exports.ticketStatus = ticketStatus
