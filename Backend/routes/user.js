const { Register, Login } = require("../controllers/user");
const router = require("express").Router();

router.post("/register", Register);
router.post("/login", Login);


module.exports = router;
