# ShamRock-it Server
## Author: Nick Wimmers

#### Functionality: 
Tickets created in ShamRock-it receive a response message from Ninja giving the ticket id and other details. 
ShamRock-it sends this data to this server to be monitored and manipulated as ticket statuses are updated within Ninja. 
The server sends multiple requests to the Ninja RMM API endpoint using the ticketId stored in the database. 
If the status column from the database is different from the status value in the Ninja response, the database will be updated. 
If the ticket is marked as RESOLVED it will delete the ticket from the database. 
This data can be reached at the /tickets path, and is mainly used to serve ShamRock-iTV to display ticket data on a Tizen OS Samsung TV. 

#### TODO:
Use ShamRock-it server to house credentials for ShamRock-it. Credentials are encrypted and are decrypted at runtime by ShamRock-it, but are currently stored on the users machine. ShamRock-it server could also be used to show ticket updates to the end user within the app, by sending a GET request to the same endpoint as ShamRock-iTV at path /tickets. This could keep users up to date about their ticket statuses, as well as give them their ticket number within the app if they have any questions regarding the ticket. 
