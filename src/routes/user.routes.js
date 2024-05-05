import { Router } from "express";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  checkLoginUser,
  refreshAccessToken,
  getCurrentUser,
  changePassword,
  updateAccountDetails,
  updateUserAvatar,
  deleteUserAvatar,
  updateWishlist,
  getnews,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  registerUser
);
router
  .route("/updateAvatar")
  .post(upload.single("avatar"), verifyJWT, updateUserAvatar);

router.route("/deleteAvatar").post(verifyJWT, deleteUserAvatar);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/checklogin").post(verifyJWT, checkLoginUser);
router.route("/refreshToken").post(refreshAccessToken);
router.route("/currentuser").get(verifyJWT, getCurrentUser);
router.route("/changePassword").post(verifyJWT, changePassword);
router.route("/updateAccountDetails").post(verifyJWT, updateAccountDetails);
router.route("/updateWishlist").post(verifyJWT, updateWishlist);
router.route("/getnews").get(getnews);

export default router;
