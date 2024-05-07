import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //generated refresh token is going to be save in DB
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //taking out data from body
  const { email, userName, password } = req.body;

  console.log(req.body);

  //validating , if any field is empty
  if ([email, userName, password].some((field) => field?.trim() === "")) {
    res.status(400).json(new ApiError(400, "All fields is required"));
    throw new ApiError(400, "All fields is required");
  }

  // checking if user already exists
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    res
      .status(409)
      .json(new ApiError(409, "User with email or username already exists"));
    throw new ApiError(409, "User with email or username already exists");
  }

  //taking local path from files provided by multer
  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files.avatar[0].path;
  }

  // uploading files on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  //creating new user in DB
  const user = await User.create({
    avatar: avatar?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  //removing password and refreshToken from response by taking user from DB using _id
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //checking if user is created on DB or not
  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user");

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    createdUser._id
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(Date.now() + 24 * 3600000),
  };

  //finally returning the response using ApiResponse
  console.log(createdUser);
  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        createdUser,
        "User registered successfuly, you are loggedIn"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  // take data from body
  const { email, password } = req.body;

  if (!email) {
    res.status(400).json(new ApiError(400, "Please enter your email"));
    throw new ApiError(400, "Please enter your email");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404).json(new ApiError(404, "User does not exists"));
    throw new ApiError(404, "User does not exists");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    res.status(404).json(new ApiError(404, "Invalid user credentials"));
    throw new ApiError(404, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(Date.now() + 24 * 3600000),
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        loggedInUser,
        // {
        // user:loggedInUser,
        // accessToken,
        // refreshToken,
        // },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    // secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .clearCookie("wishlist", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

const checkLoginUser = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    req.user._id
  );

  const loggedInUser = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(Date.now() + 24 * 3600000),
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        loggedInUser,
        // {
        // user:loggedInUser,
        // accessToken,
        // refreshToken,
        // },
        "User logged in successfully"
      )
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none",

      expires: new Date(Date.now() + 24 * 3600000),
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .cookie("wishlist", user.wishlist, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!(oldPassword && newPassword)) {
    throw new ApiError(400, "Both fields is required");
  }
  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfuly"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { userName, email } = req.body;

  if (email !== "") {
    const emailExisted = await User.findOne({ email });

    if (emailExisted) {
      throw new ApiError(400, "User already existed with this email");
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:
        email === ""
          ? {
              userName,
            }
          : { userName, email },
    },
    { new: true }
  ).select("-password -refreshToken");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account updated successfuly"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Error while uploading avatar on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(500, "Error occurs while updating avatar");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated successfuly"));
});

const deleteUserAvatar = asyncHandler(async (req, res) => {
  //Add Code to delete avatar from cloudinary
  // const avatar = await uploadOnCloudinary(avatarLocalPath);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: "",
      },
    },
    { new: true }
  ).select("-password");

  if (!user) {
    throw new ApiError(500, "Error occurs while deleting avatar");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Removed successfuly"));
});

const updateWishlist = asyncHandler(async (req, res) => {
  const { coin, action } = req.body;

  if (!coin || !action) {
    res.status(400).json(new ApiError(400, "coin or action is invalid"));
    throw new ApiError(400, "coin or action is invalid");
  }
  let wishlist = [];
  console.log(req.user);
  if (action === "add") {
    wishlist = [...req.user?.wishlist, coin];
  } else if (action === "delete") {
    wishlist = req.user?.wishlist.filter((item) => item !== coin);
  } else {
    res.status(400).json(new ApiError(400, "invalid action"));
    throw new ApiError(400, "invalid action");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { wishlist },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated successfuly"));
});

const getnews = asyncHandler(async (req, res) => {
  await fetch(
    "https://newsapi.org/v2/everything?q=cryptocurrencies OR bitcoin OR ethereum OR solana OR tether&language=en&excludeDomains=readwrite.com&sortBy=publishedAt&apiKey=f14ff4b81e6743d9931007986e765bb0"
  )
    .then(async function (response) {
      const data = await response.json();
      return res.status(200).json(data);
    })
    .catch((error) => {
      return res.status(500).json(new ApiResponse(500, error, "unSuccessful"));
    });
});

export {
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
};
