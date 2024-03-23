/*
    ShamRock-it Server Node.js server
    Author: Nick Wimmers
    ---
    Functionality: 
    Tickets created in ShamRock-it receive a response message from Ninja giving the ticket id and other details.
    ShamRock-it sends this data to this server to be monitored and manipulated as ticket statuses are updated within Ninja.
    The server sends multiple requests to the Ninja RMM API endpoint using the ticketId stored in the database.
    If the status column from the database is different from the status value in the Ninja response, the database will be updated.
    If the ticket is marked as RESOLVED it will delete the ticket from the database. This data can be reached at the /tickets path,
    and is mainly used to serve ShamRock-iTV to display ticket data on a Tizen OS Samsung TV. Dockerfile included for building a
    docker image.
    ---
    Index.js 
    Utilizes express.js to setup multiple endpoints at different paths. 
    Paths:
    /           = simple hello world html page

    /webhook    = originally for Ninja RMM API's ticketing webhook, however this will not be ready until the second half of 2024,
    serves as an endpoint for ShamRock-it to send ticket data to and store on the server.

    /tickets    = an endpoint for ShamRock-iTV to show all current tickets housed in ticket.db

    /status     = an endpoint for ShamRock-it to show the end user their current tickets and compare their status with 
    the status within ticket.db. Allows for updates on ticket status so the user knows their status, as well as their 
    ticket number to reference if they have any questions. 

    /creds      = an endpoint for ShamRock-it to receive credentials for Ninja Authorization without storing them on the client machine
*/

const express = require('express'); 
const app = express(); 
const cors = require('cors'); 
const bodyParser = require('body-parser');
const { insertRows, db, createTable, getStatus } = require('./database');
const { getAccess, ticketStatus } = require('./ninja');
// const { readFile } = require('fs/promises');
const port = 80;  

// Get access token with refresh token when app is started 
(async () => {
    // Check for environment args 
    if (process.argv.length < 4) {
        console.error('Expected two arguments: Client ID and Refresh Token')
        process.exit(1)
    } else if (process.argv.length > 4) {
        console.error('Extraneous argument, only expected: Client ID and Refresh Token')
        process.exit(1)
    }
    // Create SQLite table at application start
    await createTable('ticketNo,pcId,subject,name,email,ext,status')
    // Get access token at application start
    var accessToken = await getAccess();
    // Update ticket statuses every 5 seconds 
    const ticketStatusInterval = setInterval ( async () => {
        await ticketStatus(accessToken)
    }, 5000) 
    // Interval set for nearly an hour to get a new access token
    const accessInterval = setInterval( async () => {
        accessToken = await getAccess();
    }, 3500000)
})(); 

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS to allow any origin
// Upon deployment, adjust allowed headers and origin accordingly
// Origin may change based on how to configure TV IP to access. 
app.use(cors({
    origin: '*'
}));

// Receive POST request from ShamRock-it to insert ticket into DB
app.post('/webhook', (req, res) => {
    let data = req.body;

    var ticket = {
        "ticketNo":  data.id,
        "pcId":  data.nodeId, 
        "subject":  data.subject,
        "name":  data.attributeValues[0].value,
        "email": data.ccList.emails[0], 
        "ext":  data.attributeValues[2].value,
        "status": data.status.name
    }
    // Parse JSON data and combine them in SQL friendly form
    let keys = Object.keys(ticket).join(",");
    let values = Object.values(ticket).join("','");

    // Take keys and values from JSON and insert them accordingly into SQLite database
    insertRows(keys,values);
    
    res.status(200).send();
});

// Receive POST request from ShamRock-it to check for changes in ticket status 
app.post('/status', async (req, res) => {
    let data = req.body
    for(let i = 0; i < data.length; i++) {
        let status = await getStatus(data[i].ticketNo).catch( (e) => {
            if (e === -1) {
                console.log('Ticket not found')
                return 'CLOSED'
            } else {
                console.log(e)
            }
        })
        if (status != data[i].status) {
            data[i].status = status
        }
    }
    res.json(data)
});

// Path for handling GET requests from ShamRock-iTV
app.get('/tickets', (req, res) => {
    db.all("SELECT * FROM tickets ORDER BY ticketNo DESC", (err, rows) => {
        res.json(rows);
    });
});

// Main site, simply shows index.html
app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname})
});

// Sending credentials to ShamRock-it
app.get('/creds', (req, res) => {
    
    res.sendFile('assets', {root: __dirname})

});

app.get('/ios', (req, res) => {
    //TODO: Add endpoint for iOS app to get ninja creds
});

// Open port declared above to listen for requests
app.listen(port, () => {
    console.log(`Now listening on port ${port}`); 
});


