/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme a alteração do seu e-mail — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrapper}>
          <span style={logoText}>✂️ BarberPLUS</span>
        </div>
        <Heading style={h1}>Confirme a alteração de e-mail</Heading>
        <Text style={text}>
          Você solicitou a alteração do seu e-mail no <strong>{siteName}</strong> de{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          para{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Clique no botão abaixo para confirmar esta alteração:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar alteração de e-mail
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          Se você não solicitou esta alteração, proteja sua conta imediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
  border: '1px solid hsl(0, 0%, 90%)',
  borderRadius: '12px',
}
const logoWrapper = { marginBottom: '24px' }
const logoText = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: 'hsl(0, 0%, 9%)',
  letterSpacing: '-0.5px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(0, 0%, 9%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(0, 0%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: 'hsl(38, 92%, 50%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(38, 92%, 50%)',
  color: 'hsl(0, 0%, 9%)',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: 'hsl(0, 0%, 90%)', margin: '28px 0 20px' }
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 55%)', margin: '0' }
