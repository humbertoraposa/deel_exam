const { Op } = require("sequelize");
const { sequelize } = require("./model");

const getContractById = async (req, res) => {
    const {Contract, Profile} = req.app.get('models')
    const {id} = req.params
    const {profile} = req
    const {type} = profile
    const contract = await Contract.findOne({
        where: {id},
        include: {
            model: Profile,
            as: type === 'client'? 'Client': 'Contractor',
            where: {
                id: profile.id
            }
        }
    })
    if(!contract) return res.status(404).end()
    res.json(contract)
}

const getContracts = async (req, res) => {
    const {Contract, Profile} = req.app.get('models')
    const {profile} = req
    const {type} = profile
    const contract = await Contract.findAll({
        include: {
            model: Profile,
            as: type === 'client'? 'Client': 'Contractor',
            where: {
                id: profile.id
            }
        }
    
    })
    if(!contract) return res.status(404).end()
    res.json(contract)
}
const getUnpaidJobs = async (req, res) => {
    const {Job, Contract, Profile} = req.app.get('models')
    const {profile} = req
    const {type} = profile
    const jobs = await Job.findAll({
        where: {
            paid: {
                [Op.not]: true
            }
        },
        include: {
            model: Contract,
            where: {
                status: "in_progress"
            },
            include:{
                model: Profile,
                as: type == 'client'? 'Client': 'Contractor',
                where: {
                    id: profile.id
                }
            }
        }
    })
    if(!jobs) return res.status(404).end()
    res.json(jobs)
}
const payJob = async (req, res) => {
    const {Job, Contract, Profile} = req.app.get('models')
    const {profile} = req
    const {job_id} = req.params
    console.log(`job_id: ${job_id}`)
    const job = await Job.findOne({
        where: {
            id: job_id
        },
        include: {
            model: Contract,
            include: {
                model: Profile,
                as: 'Client',
                where: {
                    id: profile.id
                }
            }
        }
    })
    if (!job) return res.status(404).end()
    if (job.paid) return res.status(401).end("Job already paid")
    const contract = await job.getContract()
    const client = await contract.getClient()

    if (job.price > client.balance) return res.status(401).end("Unsufficient balance to execute the payment")

    const contractor = await contract.getContractor()
    const contractorBalance = contractor.balance + job.price
    const clientBalance = client.balance - job.price

    const t = await sequelize.transaction()
    try{
        await Profile.update({balance: contractorBalance},
            {where: {id: contractor.id}},
            { transaction: t }
        )
        console.warn("Passou na segunda query")
        await Profile.update({balance: clientBalance},
            {where: {id: client.id}},
            { transaction: t }
        )
        console.warn("Passou na primeira query")
        await Job.update({paid: true},
            {where: {id: job_id}},
            { transaction: t }
        )
        console.warn("Passou na terceira query")
        await t.commit()
        res.status(200).end(`Payment of ${job.price} USD done to ${contractor.firstName} ${contractor.lastName}`)
    } catch (err) {
        await t.rollback()
        res.status(500).end("Error while updating. No changes were made.")
    }

}
const deposit = async (req, res) => {

}
const getMostRecievedByDate = async (req, res) => {

}
const getMostPaidByDate = async (req, res) => {

}

module.exports = {
    getContractById,
    getContracts,
    getUnpaidJobs,
    payJob,
    deposit,
    getMostRecievedByDate,
    getMostPaidByDate
}