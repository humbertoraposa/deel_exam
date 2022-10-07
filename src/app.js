const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const  Service = require('./service') 
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.get('/contracts/:id',getProfile ,Service.getContractById)
app.get('/contracts',getProfile ,Service.getContracts)
app.get('/jobs/unpaid',getProfile ,Service.getUnpaidJobs)
app.post('/jobs/:job_id/pay',getProfile ,Service.payJob)
app.post('/balances/deposit/:userId',getProfile ,Service.deposit)
app.get('/admin/best-profession?start=<date>&end=<date>',getProfile ,Service.getMostRecievedByDate)
app.get('/admin/best-clients?start=<date>&end=<date>&limit=<integer>',getProfile ,Service.getMostPaidByDate)

module.exports = app;
