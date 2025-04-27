const {
  Register,
  Login,
  addToHistory,
  getUserHistory,
} = require("../controllers/user");
const router = require("express").Router();

router.post("/register", Register);
router.post("/login", Login);
router.post("/add_to_activity", addToHistory);
router.get("/get_all_activity", getUserHistory);

module.exports = router;
