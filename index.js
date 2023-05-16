const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 4000

app.use(cors());
app.use(express.json());
require('dotenv').config()


// function to verifyJwtToken
const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'invalid authorization' })
    }
    const token = authorization.split(' ')[1];
    // console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(500).send({ error: true, message: 'invalid authorization' })
        }
        req.decoded = decoded
        next()
    })
}


const uri = `mongodb+srv://${process.env.DB_ACC}:${process.env.DB_PASS}@cluster0.8odccbh.mongodb.net/?retryWrites=true&w=majority`;

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

        const database = client.db("Car-Doctor");
        const databaseCollection = database.collection("Car-doctors");
        const BookingCollection = database.collection("Bookings");

        app.get('/services', async (req, res) => {
            const cursor = databaseCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { title: 1, discount: 1, img: 1 },
            };
            const result = await databaseCollection.findOne(query, options);
            res.send(result);
        })

        // bookings of specific emails
        app.get('/booking', verifyJwt, async (req, res) => {
            const decoded = req.decoded
            // console.log(decoded.user);
            //verify that the email of token matches with the user
            const email = req.query.email;
            if (email != decoded.user) {
                return res.status(403).send({ error: true, message: 'unauthorized Access denied' });
            }
            const query = { email: email }
            const result = await BookingCollection.find(query).toArray()
            res.send(result);
        })


        app.post('/booking', async (req, res) => {
            const data = req.body;
            const result = await BookingCollection.insertOne(data)
            res.send(result);
        })

        // Jwt access token  generate
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ token })

        })



        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await BookingCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const updateConfirm = req.body
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: updateConfirm.status,
                },
            };
            const result = await BookingCollection.updateOne(query, updateDoc)
            res.send(result);
        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('this is port');
})

app.listen(port, async (req, res) => {
    console.log(`listening on port in http://localhost:${port}`);
    // console.log(require('crypto').randomBytes(64).toString('hex'))
});