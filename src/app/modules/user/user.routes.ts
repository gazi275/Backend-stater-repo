import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { userController } from "./user.controller";
import { UserValidation } from "./user.validation";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import { fileUploader } from "../../helper/uploadFile";
import { parseBodyMiddleware } from "../../middleware/parseBodyData";

const route = Router();


route.post(
  "/create",
  userController.createUserController
);

route.patch(
  "/change-password",
  auth(),
  validateRequest(UserValidation.changePasswordValidation),
  userController.changePasswordController
);

route.patch(
  "/me",
  auth(),
  fileUploader.uploadProfileImage,
  parseBodyMiddleware,
  userController.updateUserController
);
route.delete("delete-me", auth(), userController.deleteUserController);
route.get("/me", auth(), userController.getMyProfileController);
route.get("/:id", auth(), userController.getUserByIdController);
route.delete("/:id", auth(Role.ADMIN), userController.deleteUserController);


export const userRoutes = route;
