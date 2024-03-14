/*
    ShamRock-iTV Webhook Node.js server
    Author: Nick Wimmers

    Node.js portion ready for deployment, 
    Ninja says that ticketing updates will be available 2nd half of 2024.
    Once this happens, adjust ninjaAuth function to configure webhook.

    Needs logic, based on how JSON data is sent for tickets, 
    to delete tickets from database if they move from NEW to: 
    1. DELETED
    2. OPEN
    3. CLOSED 

    Can be built as Docker image and deployed in a container

    Email support for sliding refresh token for this app.
    
    Run npm install to install required packages then node index.js to start server 

    Need nvm to install node.js and npm
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
    await createTable('ticketNo,pcId,subject,name,email,ext,status')

    var accessToken = await getAccess(); 
    var ticketStatuses

    const accessInterval = setInterval( async () => {
        accessToken = await getAccess();
    }, 3599999)

    const ticketStatusInterval = setInterval ( async () => {
        await ticketStatus(accessToken)
    }, 5000)
    
    
})(); 

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configure CORS to allow any origin and header to skip ngrok browser warning
// Upon deployment at a real domain, adjust allowed headers and origin accordingly
// Origin may change based on how to configure TV IP to access. 
app.use(cors({
    origin: '*',
    allowedHeaders: 'ngrok-skip-browser-warning'
}));

// Receive POST request from ShamRock-it

// May need to adjust how the JSON data is handled when ticket info is sent via webhook
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


