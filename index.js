const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-node-cjs-runtime");
const port = process.env.PORT || 7000


app.use(cors())
app.use(express.json())


const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

const verifyToken = async (req, res, next) => {
    const authHeader = req?.headers.authorization
    if (!authHeader) { return res.status(401).json({ message: "unauthorized" }) }



    const token = authHeader.split(" ")[1]
    if (!token) { return res.status(401).json({ message: "unauthorized" }) }

    try {
        const { payload } = await jwtVerify(token, JWKS)
        req.user = payload;
        next()
    } catch (error) {
        return res.status(403).json({ message: "Forbidden" })
    }

}


const uri = process.env.MONGODB_URI


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

        const database = client.db("petadopt");
        const petsCollections = database.collection("allpets")
        const petRequestCollections = database.collection("petsRequest")

        app.get('/allpets', async (req, res) => {
            const { search } = req.query;

            let cursor;
            if (search) {
                cursor = petsCollections.find({
                    $or: [
                        { petName: { $regex: search, $options: 'i' } },
                        { breed: { $regex: search, $options: 'i' } },
                        { species: { $regex: search, $options: 'i' } },

                    ]
                })
            } else {
                cursor = petsCollections.find()
            }

            const result = await cursor.toArray();
            res.send(result)
        })

        //add pets
        app.post('/allpets', verifyToken, async (req, res) => {
            const cursor = req.body;
            const result = await petsCollections.insertOne(cursor);
            res.send(result)
        })

        //approve request my listing
        app.patch('/allpets/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;

            await petRequestCollections.updateOne(
                { petId: id },
                { $set: { status: "adopted" } }
            )

            const result = await petsCollections.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: "adopted" } }
            );
            res.send(result)
        })

        //rejected request my listing
        app.patch('/allpets2/:rejectId', verifyToken, async (req, res) => {
            const { rejectId } = req.params;
            const { status } = req.body;


            const result = await petRequestCollections.updateOne(
                { petId: rejectId },
                { $set: { status: "rejected" } }
            )
            res.send(result)
        })





        //Edit pets
        app.patch('/editpet/:id', verifyToken, async (req, res) => {
            const { id } = req.params
            const cursor = req.body;
            const result = await petsCollections.updateOne(
                { _id: new ObjectId(id) },
                { $set: cursor }
            );
            res.send(result)
        })


        app.get('/homepagepets', async (req, res) => {
            const result = await petsCollections.find().limit(6).toArray();
            res.send(result)
        })



        // detals of pets
        app.get('/allpets/:petId', async (req, res) => {
            const petId = req.params.petId
            const result = await petsCollections.findOne({ _id: new ObjectId(petId) })
            res.send(result)
        })







        // all-pets collectiion delete
        app.delete('/allpets/:petId', verifyToken, async (req, res) => {
            const petId = req.params.petId
            const result = await petsCollections.deleteOne({ _id: new ObjectId(petId) })
            res.send(result)
        })




        // adoption request
        app.post('/petrequest/:petId', verifyToken, async (req, res) => {

            const { petId } = req.params;
            const adoptData = req.body

            try {
                const adoptRequest = await petRequestCollections.findOne({ petId: petId, userId: adoptData?.userId })
                if (adoptRequest) {
                    return res.status(400).json({ message: "is already Requested" })
                }

                // await petsCollections.updateOne(
                //     { _id: new ObjectId(petId) },
                //     { $set: { status: "pending", updatedAt: new Date() } }
                // )
                const date = new Date();

                const newDate = date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });


                const result = await petRequestCollections.insertOne({
                    ...adoptData,
                    adoptAt: newDate,
                })
                res.json(result)
            }
            catch (error) {
                res.status(500).json({ error: error.message })
            }



        })


        // my listing
        app.get('/mylisting/:userId', async (req, res) => {
            const { userId } = req.params
            const result = await petsCollections.find({ userId: userId }).toArray()
            res.send(result)
        })

        // my request
        app.get('/petrequest/:userId', async (req, res) => {
            const { userId } = req.params;
            const result = await petRequestCollections.find({ userId: userId }).toArray()
            res.send(result)
        })

        // my listing request modal
        app.get('/petrequestbyid/:petId', async (req, res) => {
            const { petId } = req.params;
            const result = await petRequestCollections.findOne({ petId: petId })
            res.send(result)

        })


        app.delete('/petrequest/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await petRequestCollections.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
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


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


















