const customerSupportEmail = 'support@nue.com';
const customerSupportPhone = '+234 700 NUECBA';

const ResetPasswordTemp = ({
  resetURL,
  expiryTime,
}: {
  resetURL: string;
  expiryTime: string;
}) => {
  return `
            <p>Please reset password by clicking on the following link :
            <a href="${resetURL}"><b style="text-decoration: underline; color: blue;">Reset Password</b></a>
            </p>
            <br/>
            <br/>
            <p>This link will expire at <b>${expiryTime}</b>. If you did not request this link, please ignore this email.</p>
            <p>If you have any question or need assistance, feel free to reach out to our support team at ${customerSupportPhone} or ${customerSupportEmail}.</p>
            <p>${resetURL}<p>`;
};

const SetUpAccountTemp = ({
  setUpLink,
  expiryTime,
}: {
  setUpLink: string;
  expiryTime: string;
}) => {
  return `
    <p>You've been invited to join the Team!. To get started, please complete your account setup by following these steps:</p>
    
    <ul style="list-style-type: decimal;">
      <li>Click on the link to access the account setup page: <a href="${setUpLink}"><b style="text-decoration: underline; color: blue;">Setup Account</b></a></li>
      <li>Enter your first name and last name.</li>
      <li>Create a secure password for your account.</li>
      <li>Click “Submit” to finalize your setup.</li>
    </ul>
    
    <br/>
    <br/>
    
    <p>If you have any question or need assistance, feel free to reach out to our support team at ${customerSupportPhone} or ${customerSupportEmail}.</p>
    <br/>
    <p>Thank you for joining us! We look forward to having you on board.</p>
    <p>This link will expire at <b>${expiryTime}</b>. If you did not request this link, please ignore this email.</p>
    <p>${setUpLink}<p>`;
};

const LoginAlertSuccessTemp = ({ loginTime }: { loginTime: string }) => {
  return `<p>We noticed that you logged into your Nue CBA Portal account on <b>${loginTime}</b>. 
            This is part of our security measures to protect your account and ensure that no one else has access to your information.</p>
          <br/>  
          <p>If this was you, you don’t need to do anything. 
          However, if you did not log in or recognize this device, please contact us immediately at ${customerSupportPhone} or ${customerSupportEmail}.
          We will help you secure your account and prevent any information leaks.</p>
        `;
};

const LoginAlertFailedTemp = ({ loginTime }: { loginTime: string }) => {
  return `<p>We noticed a failed log in attempt into your Nue Cba Portal account on <b>${loginTime}</b>. 
    This is part of our security measures to protect your account and ensure that no one else has access to your information.</p>
     <br/>  
    <p>If this was you, you don’t need to do anything. 
    However, if you did not attempt to log in , please contact us immediately at ${customerSupportPhone} or ${customerSupportEmail}.
    We will help you secure your account and prevent any information leaks.</p>`;
};

/**
 * Helper function to generate the 6-box HTML grid
 */
const renderTokenBoxes = (token: string) => {
  return token
    .split('')
    .map(
      (digit) => `
    <span style="
      display: inline-block;
      width: 40px;
      height: 45px;
      line-height: 45px;
      text-align: center;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      margin-right: 8px;
      font-size: 24px;
      font-weight: bold;
      color: #111827;
      background-color: #f9fafb;
    ">
      ${digit}
    </span>
  `,
    )
    .join('');
};

const LoginOtpTemp = ({
  token,
  expiryTime,
}: {
  token: string;
  expiryTime: string;
}) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #374151;">
      <p>Please use this one-time password to sign in to the portal:</p>
      
      <div style="margin: 24px 0;">
        ${renderTokenBoxes(token)}
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        This code will expire at <b>${expiryTime}</b>. 
        <br/>
        If you did not request this code, please ignore this email.
      </p>
    </div>
  `;
};

const ResetOtpTemp = ({
  setupUrl,
  expiryTime,
}: {
  setupUrl: string;
  expiryTime: string;
}) => {
  return ` <p>Please reset authenticator one time password (OTP) by clicking on the following link :
            <a href="${setupUrl}"><b style="text-decoration: underline; color: blue;">Reset OTP</b></a>
            </p>
            <br/>
            <br/>
            <p>This link will expire at <b>${expiryTime}</b>. If you did not request this link, please ignore this email.</p>
            <p>If you have any question or need assistance, feel free to reach out to our support team at ${customerSupportPhone} or ${customerSupportEmail}.</p>
            <p>${setupUrl}<p>`;
};

const RegisterOtpTemp = ({
  token,
  expiryTime,
}: {
  token: string;
  expiryTime: string;
}) => {
  return `
    <p style="font-family: sans-serif; color: #4b5563;">Please use this one-time password to complete your registration:</p>
    <div style="margin: 24px 0;">
        ${renderTokenBoxes(token)}
      </div>
    <p style="font-family: sans-serif; color: #4b5563; font-size: 13px;">
      This code will expire at <b>${expiryTime}</b>. If you did not request this code, please ignore this email.
    </p>
  `;
};

export const EmailTemplates = {
  ResetPasswordTemp,
  LoginAlertSuccessTemp,
  LoginAlertFailedTemp,
  LoginOtpTemp,
  RegisterOtpTemp,
  SetUpAccountTemp,
  ResetOtpTemp,
};
