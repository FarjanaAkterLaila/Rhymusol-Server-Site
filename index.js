const express = require('express') ;
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;


require('dotenv').config()
// middleware
app.use(cors());
app.use(express.json());

console.log(process.env.DB_USER)


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zmwk4eu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const userCollection = client.db('musicDb').collection('user');
    const classesCollection = client.db('musicDb').collection('classes');
    const cardCollection = client.db('musicDb').collection('addcard');
    
    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    // user info added
    app.get('/user', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.post('/user',async(req,res)=>{
    const user = req.body;
    const query = { email: user.email }
    const existingUser = await userCollection.findOne(query);

    if (existingUser) {
      return res.send({ message: 'user already exists' })
    }

    const result = await userCollection.insertOne(user);
    res.send(result);
  })

    //classes
    app.get('/classes', async (req, res) => {
      const cursor = classesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
  })
  
  //addcard
app.get('/addcard',async(req,res)=>{
  const email = req.query.email;

  if (!email) {
    res.send([]);
  }

  //const decodedEmail = req.decoded.email;
  if (!email) {
    return res.status(403).send({ error: true, message: 'porviden access' })
  }

  const query = { email: email };
  const result = await cardCollection.find(query).toArray();
  res.send(result);
})
  app.post('/addcard',async(req,res)=>{
    const iteam = req.body;
    console.log(iteam);
    const result = await cardCollection.insertOne(iteam)
    res.send(result);
  })
  
  app.delete('/addcard/:id', async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const query = { _id: new ObjectId(id)};
     const result = await cardCollection.deleteOne(query);
     res.send(result);
  })




  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send("school setting")
})
app.listen(port,()=>{
    console.log(`school is sitting on port: ${port}`);
})