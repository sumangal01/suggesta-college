  const express = require('express')

  function generateEmailTemplate(verificationToken) {
      return `
    <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; text-align: center;">
      <table role="presentation" style="width: 100%; background-color: #f4f4f4; margin: 0; padding: 0; border-collapse: collapse;">
          <tr>
              <td align="center">
                  <table role="presentation" style="width: 600px; background-color: #ffffff; margin: 20px auto; border-radius: 8px; padding: 20px; border-collapse: collapse; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                      <tr>
                          <td align="center" style="padding: 20px;">
                              <img src="https://ik.imagekit.io/1l2q5onxz/suggesta-high-resolution-logo-grayscale%20(1).png?updatedAt=1732350982589" alt="Email Icon" style="width: 240px; height: 160px; margin-bottom: 20px; display: block; border: none;">
                          </td>
                      </tr>
                      <tr>
                          <td align="center" style="font-size: 24px; font-weight: bold; color: #333; padding: 10px 20px;">
                              Verify your email address
                          </td>
                      </tr>
                      <tr>
                          <td align="center" style="font-size: 16px; color: #666; line-height: 1.5; padding: 10px 20px;">
                              To complete your profile and start using our services, please verify your email address.
                          </td>
                      </tr>
                      <tr>
                          <td align="center" style="padding: 20px;">
                              <a href="http://localhost:8000/api/auth/verify/${verificationToken}" style="background-color: #0066FF; color: #ffffff; text-decoration: none; padding: 12px 60px; font-size: 16px; font-weight: bold; border-radius: 25px; display: inline-block; text-transform: uppercase;">
                                  Verify
                              </a>
                          </td>
                      </tr>
                      <tr>
                          <td align="center" style="font-size: 14px; color: #666; line-height: 1.5; padding: 10px 20px;">
                              Have a question? <a href="#support" style="color: #0066FF; text-decoration: none;">Contact our support team</a>
                          </td>
                      </tr>
                  </table>
                  <table role="presentation" style="width: 600px; margin: 0 auto; text-align: center; color: #999; font-size: 12px; line-height: 1.5; padding: 20px 0;">
                      <tr>
                          <td>
                              © 2024 Your Company Name<br>
                              123 Business Street, City, ST 12345
                          </td>
                      </tr>
                  </table>
              </td>
          </tr>
      </table>
  </body>
  </html>

      `;
    }
  module.exports = {
      generateEmailTemplate
  };
    
      //          <a href="http://localhost:3000/api/auth/verify/${verificationToken}" class="email-button">Verify Email</a>