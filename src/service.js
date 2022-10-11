const { Op, QueryTypes } = require("sequelize");
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
            attributes: [],
            where: {
                status: "in_progress"
            },
            include:{
                model: Profile,
                attributes: [],
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
        await Profile.update({balance: clientBalance},
            {where: {id: client.id}},
            { transaction: t }
        )
        await Job.update({
                paid: true,
                paymentDate: new Date(),
            },
            {where: {id: job_id}},
            { transaction: t }
        )
        await t.commit()
        res.status(200).end(`Payment of ${job.price} USD done to ${contractor.firstName} ${contractor.lastName}`)
    } catch (err) {
        await t.rollback()
        res.status(500).end("Error while updating. No changes were made.")
    }

}
const deposit = async (req, res) => {
    const {Contract, Job, Profile} = req.app.get('models')
    const {userId} = req.params
    const {profile} = req
    const {value} = req.body
    if(!value || value<=0) return res.status(400).end('The deposited value is not valid')
    if (userId != profile.id) return res.status(401).end('You are not allowed to add to a balance that is not yours')
    const sumJobs = await Job.sum('price', {
        where:{
            paid: {
                [Op.not]: true
            }
        },
        group: '`Contract->Client`.`id`',
        include: {
            model: Contract,
            required: true,
            attributes:[],
            include: {
                model: Profile,
                as: 'Client',
                required: true,
                attributes:[],
                where: {
                    id: userId
                }
            }
        }
    })
    if(!sumJobs || value > sumJobs/4) return res.status(401).end(`You are not alowed to deposit more than 25% of total value pending payment.`)

    const balance = value + profile.balance
    Profile.update({balance}, {where: {id: userId}})

    res.status(200).json(`New balance for ${profile.firstName} ${profile.lastName} is ${balance}`)
}
const getBestProfessionByDate = async (req, res) => {
    
    const {start, end} = req.query
    const endDate = new Date(end)
    endDate.setDate(endDate.getDate() + 1 )

    const best = await sequelize.query(
        'SELECT sum(`price`) as earned, `Contract->Contractor`.`profession` AS `profession` FROM `Jobs` AS `Job` INNER JOIN `Contracts` AS `Contract` ON `Job`.`ContractId` = `Contract`.`id` INNER JOIN `Profiles` AS `Contract->Contractor` ON `Contract`.`ContractorId` = `Contract->Contractor`.`id` WHERE `Job`.`paid` = 1 AND `Job`.`paymentDate` BETWEEN ? AND ? GROUP BY `Contract->Contractor`.`profession` ORDER BY sum(`price`) DESC LIMIT 1;',
        {
            replacements: [start, endDate],
            type: QueryTypes.SELECT
        }
    ) 
    
    if(!best) return res.status(404).end(`No payment was found in the given dates.`)
    res.status(200).json(best[0])
}
const getMostPaidByDate = async (req, res) => {
    
    const {start, end} = req.query
    const endDate = new Date(end)
    endDate.setDate(endDate.getDate() + 1 )
    const limit = req.query.limit || 2
    const best = await sequelize.query('SELECT sum(`price`) as paid, `Contract->Client`.`id` AS `ClientId`, `Contract->Client`.`firstName` AS `Client First Name`, `Contract->Client`.`lastName` AS `Client Last Name` FROM `Jobs` AS `Job` INNER JOIN `Contracts` AS `Contract` ON `Job`.`ContractId` = `Contract`.`id` INNER JOIN `Profiles` AS `Contract->Client` ON `Contract`.`ClientId` = `Contract->Client`.`id` WHERE `Job`.`paid` = 1 AND `Job`.`paymentDate` BETWEEN ? AND ? GROUP BY `Contract->Client`.`id` ORDER BY sum(`price`) DESC LIMIT ? ;',
        {
            replacements: [start, endDate, limit],
            type: QueryTypes.SELECT
            
        })
    
    if(!best) return res.status(404).end(`No payment was found in the given dates.`)
    res.status(200).json(best)
    
}

module.exports = {
    getContractById,
    getContracts,
    getUnpaidJobs,
    payJob,
    deposit,
    getBestProfessionByDate,
    getMostPaidByDate
}