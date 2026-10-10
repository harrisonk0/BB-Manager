import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import type { CompanyEvent } from '../../types/portal';
import { branding } from '../branding';
import { eventDateLabel, londonDateTime } from '../../services/portal';
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    padding: 42,
    color: '#14213d',
  },
  brand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: { width: 100 },
  company: { width: 70 },
  eyebrow: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 18,
  },
  title: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.15,
    marginBottom: 24,
  },
  cancelled: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    padding: 14,
    marginBottom: 20,
  },
  info: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
    borderLeftColor: '#1e3a8a',
    padding: 20,
    marginBottom: 24,
  },
  date: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 10 },
  location: { fontSize: 14, lineHeight: 1.4 },
  details: { fontSize: 13, lineHeight: 1.6 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 42,
    right: 42,
    fontSize: 9,
    color: '#64748b',
  },
});
export default function EventPosterDocument({
  event,
}: {
  event: CompanyEvent;
}) {
  return (
    <Document title={event.title} author="BB Manager">
      <Page size="A4" style={styles.page}>
        <View style={styles.brand}>
          <Image src={branding.bbLogo} style={styles.logo} />
          <Image src={branding.companyLogo} style={styles.company} />
        </View>
        <Text style={styles.eyebrow}>THE BOYS’ BRIGADE · COMPANY SECTION</Text>
        {event.cancelled && (
          <Text style={styles.cancelled}>EVENT CANCELLED</Text>
        )}
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.info} wrap={false}>
          <Text style={styles.date}>
            {eventDateLabel(event.starts_at)} –{' '}
            {londonDateTime(event.ends_at).slice(11)}
          </Text>
          {event.location && (
            <Text style={styles.location}>{event.location}</Text>
          )}
        </View>
        {event.details && <Text style={styles.details}>{event.details}</Text>}
        <Text style={styles.footer} fixed>
          Company Section · All times Europe/London
        </Text>
      </Page>
    </Document>
  );
}
