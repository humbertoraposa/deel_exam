const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const {getAdmin} = require('./middleware/getAdmin')
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

// Admin methods
app.get('/admin/best-profession',getAdmin ,Service.getBestProfessionByDate)
app.get('/admin/best-clients',getAdmin ,Service.getMostPaidByDate)

module.exports = app;
