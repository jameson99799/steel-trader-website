import express from 'express'
const app = express()
app.put('/channels/:id', (req, res) => {
    console.log('Matched /channels/:id', req.params.id)
    res.end()
})
app.put('/channels/:id/set-default', (req, res) => {
    console.log('Matched /channels/:id/set-default')
    res.end()
})

const req = { url: '/channels/1/set-default', method: 'PUT' }
const res = { end: () => {} }
app.handle(req, res)
