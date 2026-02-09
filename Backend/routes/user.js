const {
  Register,
  Login,
  addToHistory,
  getUserHistory,
} = require("../controllers/user");
const router = require("express").Router();

router.post("/register", Register);
router.post("/login", Login);
router.get("/user/get_all_activity", getUserHistory);
router.post("/user/add_to_activity", addToHistory);

module.exports = router;
