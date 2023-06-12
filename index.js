const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');

const port = process.env.PORT || 5000;


require('dotenv').config()
// middleware
app.use(cors());
app.use(express.json());
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

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
    const instrucCollection = client.db('musicDb').collection('instructor');
    const cardCollection = client.db('musicDb').collection('addcard');
    const paymentCollection = client.db("musicDb").collection("payments");

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: 60 * 60 })

      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (user?.role !== 'Admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }



    // user info added
    app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    app.get('/payments', async (req, res) => {
      
      const payments = await paymentCollection.find().sort({ date: -1 }).toArray();
      res.send(payments);
    });


    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    //admin info
    app.get('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'Admin' }
      res.send(result);
    })


    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'Admin'
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    //instructor 
    app.get('/user/instructor/:email',verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(email)
      console.log(req.decoded.email)
      
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
    
      const query = { email: email }
      const user = await userCollection.findOne(query);
      console.log(user?.role)
      const result = { instructor: user?.role === 'Instructor' }
      console.log(user?.role)
      res.send(result);
    })
    app.patch('/user/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'Instructor'
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    //classes
    app.get('/classes', async (req, res) => {
      const cursor = classesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/instractor', async (req, res) => {
      const cursor = instrucCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.post('/classes', verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await classesCollection.insertOne(newItem)
      res.send(result);
    })
   
    //addcard
    app.get('/addcard', async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      // const decodedEmail = req.decoded.email;
      // if (email !== req.email) {
      //   return res.status(403).send({ error: true, message: 'forbidden access' })
      // }

      const query = { email: email };
      const result = await cardCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/addcard/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await cardCollection.findOne(query);
      res.send(result);
  })
    app.post('/addcard', async (req, res) => {
      const iteam = req.body;
      console.log(iteam);
      const result = await cardCollection.insertOne(iteam)
      res.send(result);
    })

    app.delete('/addcard/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cardCollection.deleteOne(query);
      res.send(result);
    })

// payment 
app.post('/create-payment-intent', async (req, res) =>{
  const {price} = req.body;
 
  const amount = price*100;
  console.log(price,amount)
  const paymentIntent = await stripe.paymentIntents.create({
    amount:amount,
    currency:'usd',
    payment_method_types: [
      'card'
    ],
  });
  res.send({
    clientSecret:paymentIntent.client_secret
  })
})
app.post('/payments', verifyJWT, async (req, res) => {
  const payment = req.body;
  const insertResult = await paymentCollection.insertOne(payment);
  const itemIdToDelete = payment.id;
  
  const query = { _id: itemIdToDelete };
  const deleteResult = await cardCollection.deleteOne(query);
  
  res.send({ insertResult, deleteResult });
});

  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("school setting")
})
app.listen(port, () => {
  console.log(`school is sitting on port: ${port}`);
})