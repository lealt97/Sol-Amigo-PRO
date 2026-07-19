import React from 'react';
import { View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { Proposal } from '../../../types/proposal';
import { fitTextWithinBox, formatClientAddress } from '../../../lib/pdf/textLayout';

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 30,
    backgroundColor: '#fafafa',
    border: '1px solid #e4e4e7',
    borderRadius: 8,
    alignItems: 'center',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#18181b',
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    color: '#52525b',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  linkBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    padding: 15,
    borderRadius: 6,
    width: '100%',
  },
  linkTitle: {
    fontSize: 10,
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  link: {
    fontSize: 12,
    color: '#1d4ed8',
  },
  signatureBox: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  signatureLineContainer: {
    width: '45%',
    alignItems: 'center',
    minHeight: 150,
  },
  sellerSignatureImage: {
    width: 165,
    height: 58,
    objectFit: 'contain',
    marginBottom: 2,
  },
  signatureLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#18181b',
    marginTop: 58,
    marginBottom: 10,
  },
  signatureLineBelowImage: {
    width: '100%',
    height: 1,
    backgroundColor: '#18181b',
    marginTop: 0,
    marginBottom: 10,
  },
  signatureName: {
    width: '100%',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: 'bold',
    color: '#18181b',
    textAlign: 'center',
  },
  signatureRole: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 3,
  },
  clientAddress: {
    width: '100%',
    fontSize: 8,
    lineHeight: 9,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 5,
  },
});

export const AcceptanceSection = ({ proposal }: { proposal: Proposal }) => {
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/proposta/${proposal.public_token}`
    : `https://[SISTEMA]/proposta/${proposal.public_token}`;

  const sellerName = proposal.profile?.seller_name || proposal.profile?.company_name || 'Empresa de Energia Solar';
  const signatureUrl = proposal.profile?.seller_signature_url || null;
  const clientName = proposal.client?.name || 'Cliente';
  const clientAddress = formatClientAddress(proposal.client);

  const sellerLayout = fitTextWithinBox(sellerName, {
    width: 195,
    height: 34,
    maxFontSize: 12,
    minFontSize: 7,
    maxLines: 2,
  });
  const clientLayout = fitTextWithinBox(clientName, {
    width: 195,
    height: 34,
    maxFontSize: 12,
    minFontSize: 7,
    maxLines: 2,
  });
  const addressLayout = clientAddress
    ? fitTextWithinBox(clientAddress, {
      width: 195,
      height: 42,
      maxFontSize: 8,
      minFontSize: 4,
      maxLines: 4,
      lineHeightFactor: 1.12,
    })
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Próximos Passos</Text>
      <Text style={styles.text}>
        Agradecemos a oportunidade de apresentar esta proposta comercial.
        Para aprovar e dar início ao projeto do seu sistema de energia solar,
        acesse o link abaixo ou assine este documento.
      </Text>

      {proposal.public_token && (
        <View style={styles.linkBox}>
          <Text style={styles.linkTitle}>Link para Aprovação Digital:</Text>
          <Text style={styles.link}>{publicUrl}</Text>
        </View>
      )}

      <View style={styles.signatureBox} wrap={false}>
        <View style={styles.signatureLineContainer}>
          {signatureUrl ? (
            <>
              <Image src={signatureUrl} style={styles.sellerSignatureImage} />
              <View style={styles.signatureLineBelowImage}></View>
            </>
          ) : (
            <View style={styles.signatureLine}></View>
          )}
          <Text
            style={[
              styles.signatureName,
              { fontSize: sellerLayout.fontSize, lineHeight: sellerLayout.lineHeight },
            ]}
          >
            {sellerLayout.lines.join('\n')}
          </Text>
          <Text style={styles.signatureRole}>Representante Comercial</Text>
        </View>
        <View style={styles.signatureLineContainer}>
          <View style={styles.signatureLine}></View>
          <Text
            style={[
              styles.signatureName,
              { fontSize: clientLayout.fontSize, lineHeight: clientLayout.lineHeight },
            ]}
          >
            {clientLayout.lines.join('\n')}
          </Text>
          <Text style={styles.signatureRole}>De acordo</Text>
          {addressLayout && (
            <Text
              style={[
                styles.clientAddress,
                { fontSize: addressLayout.fontSize, lineHeight: addressLayout.lineHeight },
              ]}
            >
              {addressLayout.lines.join('\n')}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};
