/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação — BarberPLUS</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrapper}>
          <span style={logoText}>✂️ BarberPLUS</span>
        </div>
        <Heading style={h1}>Confirme sua identidade</Heading>
        <Text style={text}>Use o código abaixo para verificar sua identidade:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Este código expira em breve. Se você não solicitou isto, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(38, 92%, 50%)',
  letterSpacing: '4px',
  margin: '0 0 30px',
}
const hr = { borderColor: 'hsl(0, 0%, 90%)', margin: '28px 0 20px' }
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 55%)', margin: '0' }
