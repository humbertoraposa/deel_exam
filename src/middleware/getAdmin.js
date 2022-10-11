const validateToken = async (token) => {
    // TODO: insert token validation logic here
    return (token === "validAccessToken")
} 

const getAdmin = async (req, res, next) => {
    const adminToken = req.get('admin_token') || false
    if(validateToken(adminToken)) return next()
    return res.status(401).end()
}
module.exports = {getAdmin}