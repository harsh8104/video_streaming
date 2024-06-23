import { asynchandler } from "../utils/aysncHandler.utils.js";
import { apiError } from "../utils/apiError.utils.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.utils.js";
import { apiResponse } from "../utils/apiResponse.utils.js";
import jwt from "jsonwebtoken";
const generateRefreshAccessTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new apiError(500, "Can't Generate refresh and access tokens");
  }
};

const registerUser = asynchandler(async (req, res) => {
  //get user details from frontend
  //validation-not empty
  //check if user already exist from username,email
  //check for images.check for avatar
  //upload to cloudinary,avatar
  //create user object-create entry in db
  //check for user creation
  //remove password and refresh token field from response
  //return response

  const { username, email, fullname, password } = req.body;
  if (
    [username, email, fullname, password].some((itr) => {
      return itr?.trim() === "";
    })
  ) {
    throw new apiError(400, "All fields are mandotory");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User already registered");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar file is required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  const isUserCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!isUserCreated) {
    throw new apiError(500, "Failed to create user");
  }

  return res
    .status(201)
    .json(new apiResponse(200, isUserCreated, "User Registered Successfully"));
});

const loginUser = asynchandler(async (req, res) => {
  //get input from user
  // username or email base search
  //find the user
  //password check
  //access and refresh token
  //send cookie

  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new apiError(400, "Username or Email is Required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(404, "User doesn't exist");
  }

  const isPassword = await user.isPasswordCorrect(password);

  if (!isPassword) {
    throw new apiError(401, "Password is incorrect");
  }

  const { refreshToken, accessToken } = await generateRefreshAccessTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          refreshToken,
          accessToken,
        },
        "User Logged In successfully"
      )
    );
});

const logoutUser = asynchandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (!user?.refreshToken === incomingRefreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { refreshToken, accessToken } = await generateRefreshAccessTokens(
      user?._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        200,
        {
          refreshToken,
          accessToken,
        },
        "accesstoken is refreshed"
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asynchandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?.id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new apiError(400, "Invalid Password");
  }
  user.password = newPassword;
  await user.save({
    validateBeforeSave: false,
  });
  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asynchandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

const updateAccountDetails = asynchandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname && !email) {
    throw new apiError(400, "email or username is required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,

    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asynchandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new apiError(400, "Error while uploading avatar on cloudinary");
  }

  const user=await findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res.status(200)
  .json(apiResponse(200,
    user,
    "Avatar Updated Successfully!"
  ))
});

const updateUserCoverImage = asynchandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new apiError(400, "coverImage file is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new apiError(400, "Error while uploading coverImage on cloudinary");
  }

  const user=await findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");


  return res.status(200)
  .json(apiResponse(200,
    user,
    "Cover Image Updated Successfully!"
  ))
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
