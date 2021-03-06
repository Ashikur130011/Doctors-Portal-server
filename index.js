const express = require("express");
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

//doctor-portal-firebase-adminsdk.json

//brfore gitignore
/* const serviceAccount = require("./doctor-portal-firebase-adminsdk.json"); */

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tv45h.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
      const token = req.headers.authorization.split(' ')[1]
  }
  try{
    const decodadedUser = await admin.auth().verifyIdToken(token);
    req.decodedEmail = decodadedUser.email;
  }
  catch{

  }
  next()
}

async function run() {
    try{
        await client.connect();
        console.log('database connected successfully');

        const database = client.db("DoctorDB");
        const appointmentCollection = database.collection("appointments");
        const usersCollection = database.collection('users')
        //POST APPOINTMENT DATA
        app.post("/appointments", async (req, res) => {
          const appointment = req.body;
          const result = await appointmentCollection.insertOne(appointment)
          res.json(result)
        });
        app.get('/users/:email', async (req, res) => {
          const email = req.params.email;
          const query = {email: email};
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if(user?.role === 'admin'){
            isAdmin=true;
          }
          res.json({admin: isAdmin})
        })
        //POST USER DATA
        app.post('/users', async(req,res)=> {
          const user = req.body;
          const result = await usersCollection.insertOne(user);
          res.json(result)

        })
        app.put('/users', async(req,res)=> {
            const user = req.body;
            
            const filter = {email: user.email};
            const options = {upsert: true};
            const updateDoc = {$set: user};
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            console.log(result);
            res.json(result);

        })
        app.put('/users/admin', verifyToken, async (req, res) => {
          const user = req.body;
          console.log("put", req.decodedEmail);
          if(requester){
            const requestAccount = await usersCollection.findOne({email: requester});
            if(requestAccount.role === 'admin'){
              const filter = { email: user.email };
              const updateDoc = { $set: { role: "admin" } };
              const result = await usersCollection.updateOne(filter, updateDoc);
              console.log(result);
              res.json(result);
            }
          }
          else{
            res.status(403).json({message: 'you do not have access'})
          }
          
          
        })

        app.get('/appointments', async(req,res) => {
          const email= req.query.email;
          const date = new Date(req.query.date).toDateString();
          console.log(date);
          const query={email: email, date: date}
          const cursor = appointmentCollection.find(query)
          const appointments = await cursor.toArray();
          res.json(appointments)
        })

    }
    finally{
        //await client.close();
    }
}
run().catch(console.dir);

console.log(uri);
app.get("/", (req, res) => {
  res.send("Hello doctor portal!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
