import * as nodemailer from "nodemailer";
import {logger} from "firebase-functions/v2";

// Email configuration
export const EMAIL_USER = "hed-tjyuzon@smu.edu.ph";
export const EMAIL_PASSWORD = "khjo xjed akne uonm";

export const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

logger.info("Email transporter configured", {user: EMAIL_USER});
