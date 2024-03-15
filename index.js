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
    and is mainly used to serve ShamRock-iTV to display ticket data on a Tizen OS Samsung TV. 
    ---
    TODO:
    Use ShamRock-it server to house credentials for ShamRock-it. Credentials are encrypted and are decrypted at runtime by ShamRock-it,
    but are currently stored on the users machine. ShamRock-it server could also be used to show ticket updates to the end user within the app, 
    by sending a GET request to the same endpoint as ShamRock-iTV at path /tickets. This could keep users up to date about their ticket statuses,
    as well as give them their ticket number within the app if they have any questions regarding the ticket. 
*/

const express = require('express'); 
const app = express(); 
const cors = require('cors'); 
const bodyParser = require('body-parser');
const { insertRows, db, createTable } = require('./database');
const { getAccess, ticketStatus } = require('./ninja');
const port = 80;  

// Get access token with refresh token when app is started 
(async () => {
    // Create SQLite table at application start
    await createTable('ticketNo,pcId,subject,name,email,ext,status')
    // Get access token at application start
    var accessToken = await getAccess(); 
    // Interval set for nearly an hour to get a new access token
    const accessInterval = setInterval( async () => {
        accessToken = await getAccess();
    }, 3599999)
    // Update ticket statuses every 5 seconds 
    const ticketStatusInterval = setInterval ( async () => {
        await ticketStatus(accessToken)
    }, 5000)
    
    
})(); 

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS to allow any origin
// Upon deployment, adjust allowed headers and origin accordingly
// Origin may change based on how to configure TV IP to access. 
app.use(cors({
    origin: '*'
}));

// Receive POST request from ShamRock-it
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

// Path for handling GET requests from the application 
app.get('/tickets', (req, res) => {
    db.all("SELECT * FROM tickets ORDER BY ticketNo DESC", (err, rows) => {
        res.json(rows);
    });
});

// Main site, simply shows index.html
app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname})
});

// Open port declared above to listen for requests
app.listen(port, () => {
    console.log(`Now listening on port ${port}`); 
});


