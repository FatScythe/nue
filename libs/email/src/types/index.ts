export type EmailTemplate =
  | 'general'
  | 'welcome'
  | 'alert'
  | 'reset-otp'
  | 'reset-password'
  | 'invite-user'
  | 'export-report'
  | (string & {});

export interface ISendEmailOptions {
  recipient: string;
  subject: string;
  template: EmailTemplate;
  emailData?: Record<string, any>;
  sender?: string;
}

export interface ISendGeneralNotification {
  emailAddress: string;
  subject: string;
  data: {
    firstName: string;
    body: string;
  };
}

export interface ISendReportExportNotification {
  emailAddress: string;
  subject: string;
  data: {
    firstName: string;
    reportName: string;
    fileUrl: string;
  };
}
