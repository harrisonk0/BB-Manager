import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  Svg,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
} from '@react-pdf/renderer';
import type { CompanyEvent } from '../../types/portal';
import { branding } from '../branding';
import { eventDateLabel, londonDateTime } from '../../services/portal';

Font.register({
  family: 'Open Sans',
  fonts: [
    { src: '/fonts/OpenSans-Regular.ttf' },
    { src: '/fonts/OpenSans-Bold.ttf', fontWeight: 700 },
  ],
});
const navy = '#222943';
const blue = '#3b5f91';
const accent = '#99b6dc';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Open Sans',
    backgroundColor: '#ffffff',
    color: navy,
    paddingBottom: 80,
  },
  hero: {
    position: 'relative',
    minHeight: 275,
    padding: 38,
    paddingBottom: 34,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  illustration: {
    position: 'absolute',
    top: 115,
    right: 25,
    width: 140,
    height: 140,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    gap: 7,
  },
  brand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 26,
  },
  logoTile: { backgroundColor: '#ffffff', borderRadius: 5, padding: 9 },
  logo: { width: 105 },
  company: { width: 75 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#dbeafe',
    marginBottom: 12,
  },
  title: { fontSize: 34, fontWeight: 700, lineHeight: 1.2, color: '#ffffff' },
  ribbons: { height: 6, flexDirection: 'row' },
  content: { padding: 38, paddingBottom: 25 },
  cancelled: {
    backgroundColor: '#eef2f7',
    color: navy,
    borderLeftWidth: 4,
    borderLeftColor: navy,
    padding: 14,
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 22,
  },
  info: {
    backgroundColor: '#f0f6fc',
    borderRadius: 9,
    padding: 23,
    marginBottom: 28,
    borderTopWidth: 3,
    borderTopColor: blue,
  },
  label: {
    color: blue,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
  },
  date: { fontSize: 20, fontWeight: 700, marginBottom: 7 },
  time: { fontSize: 17, color: navy, marginBottom: 19 },
  divider: { borderTopWidth: 1, borderTopColor: '#d8e5f0', marginBottom: 17 },
  location: { fontSize: 15, lineHeight: 1.4 },
  detailHeading: {
    fontSize: 10,
    fontWeight: 700,
    color: navy,
    letterSpacing: 1,
    marginBottom: 12,
  },
  details: { fontSize: 14, lineHeight: 1.7, color: '#475569' },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 38,
    right: 38,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTitle: { fontSize: 10, fontWeight: 700, color: navy },
  footerNote: { fontSize: 8, color: '#64748b', marginTop: 4 },
  footerAccent: { width: 35, height: 4, backgroundColor: accent },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 7,
    backgroundColor: navy,
  },
});
export default function EventPosterDocument({
  event,
}: {
  event: CompanyEvent;
}) {
  const start = londonDateTime(event.starts_at);
  const end = londonDateTime(event.ends_at);
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(event.starts_at));
  return (
    <Document title={event.title} author="BB Manager">
      <Page size="A4" style={styles.page}>
        <View style={styles.hero} wrap={false}>
          <Svg
            style={styles.gradient}
            viewBox="0 0 595 300"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient
                id="bb-gradient"
                x1="0"
                y1="0"
                x2="595"
                y2="300"
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%" stopColor={navy} />
                <Stop offset="55%" stopColor="#2a3e61" />
                <Stop offset="100%" stopColor={blue} />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="595"
              height="300"
              fill="url(#bb-gradient)"
            />
          </Svg>
          <Svg style={styles.illustration} viewBox="0 0 24 24">
            <Path
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.12}
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <View style={styles.brand}>
            <View style={styles.logoTile}>
              <Image src={branding.bbLogo} style={styles.logo} />
            </View>
            <View style={styles.logoTile}>
              <Image src={branding.companyLogo} style={styles.company} />
            </View>
          </View>
          <Text style={styles.eyebrow}>
            THE BOYS’ BRIGADE · COMPANY SECTION
          </Text>
          <Text style={styles.title}>{event.title}</Text>
        </View>
        <View style={styles.ribbons}>
          <View style={{ width: '65%', backgroundColor: accent }} />
          <View style={{ width: '15%', backgroundColor: '#34496b' }} />
          <View style={{ width: '20%', backgroundColor: blue }} />
        </View>
        <View style={styles.content}>
          {event.cancelled && (
            <Text style={styles.cancelled}>EVENT CANCELLED</Text>
          )}
          <View style={styles.info} wrap={false}>
            <View style={styles.labelRow}>
              <Svg width="14" height="14" viewBox="0 0 24 24">
                <Path
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  fill="none"
                  stroke={blue}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={styles.label}>WHEN</Text>
            </View>
            <Text style={styles.date}>{date}</Text>
            <Text style={styles.time}>
              {start.slice(11)} –{' '}
              {start.slice(0, 10) === end.slice(0, 10)
                ? end.slice(11)
                : eventDateLabel(event.ends_at)}
            </Text>
            {event.location && (
              <>
                <View style={styles.divider} />
                <View style={styles.labelRow}>
                  <Svg width="14" height="14" viewBox="0 0 24 24">
                    <Path
                      d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1114 0z"
                      fill="none"
                      stroke={blue}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Circle
                      cx="12"
                      cy="10"
                      r="2.5"
                      fill="none"
                      stroke={blue}
                      strokeWidth={2}
                    />
                  </Svg>
                  <Text style={styles.label}>WHERE</Text>
                </View>
                <Text style={styles.location}>{event.location}</Text>
              </>
            )}
          </View>
          {event.details && (
            <>
              <Text style={styles.detailHeading}>THE PLAN</Text>
              <Text style={styles.details}>{event.details}</Text>
            </>
          )}
        </View>
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerTitle}>The adventure begins here.</Text>
            <Text style={styles.footerNote}>
              Company Section · All times Europe/London
            </Text>
          </View>
          <View style={styles.footerAccent} />
        </View>
        <View style={styles.bottom} fixed />
      </Page>
    </Document>
  );
}
