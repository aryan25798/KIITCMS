import emailjs from '@emailjs/browser';
import { emailjsConfig } from '../config';

export const EmailService = {
  sendNewComplaintEmail: (templateParams) => {
    return emailjs.send(
      emailjsConfig.serviceId,
      emailjsConfig.templateIdNew,
      templateParams,
      emailjsConfig.publicKey
    );
  },

  sendResolvedComplaintEmail: (templateParams) => {
    return emailjs.send(
      emailjsConfig.serviceId,
      emailjsConfig.templateIdResolved,
      templateParams,
      emailjsConfig.publicKey
    );
  },
};