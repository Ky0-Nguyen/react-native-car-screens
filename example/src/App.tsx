import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CarScreens,
  isSupported,
  useCarConnected,
  useCarEvents,
  useCarRootTemplate,
  type CarEvent,
} from 'react-native-car-screens';

export default function App() {
  const connected = useCarConnected();
  const [count, setCount] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  // Declarative root: re-sent whenever `count` changes, updated in place on the car.
  useCarRootTemplate({
    type: 'tabs',
    id: 'root',
    tabs: [
      {
        type: 'information',
        id: 'status',
        title: 'Car Screens demo',
        tab: { title: 'Status', systemImage: 'gauge' },
        items: [
          { title: 'Counter', detail: String(count) },
          { title: 'Phone', detail: 'Buttons below change this screen' },
        ],
        actions: [
          { id: 'increment', title: '+1', style: 'primary' },
          { id: 'reset', title: 'Reset', style: 'destructive' },
        ],
      },
      {
        type: 'list',
        id: 'places',
        title: 'Places',
        tab: { title: 'Places', systemImage: 'list.bullet' },
        sections: [
          {
            header: 'Nearby',
            items: [
              { id: 'a', text: 'Coffee', detail: '200 m' },
              { id: 'b', text: 'Fuel', detail: '1.2 km' },
            ],
          },
        ],
      },
    ],
  });

  useCarEvents((e: CarEvent) => {
    setLog((l) => [JSON.stringify(e), ...l].slice(0, 12));
    if (e.type === 'action' && e.actionId === 'increment')
      setCount((c) => c + 1);
    if (e.type === 'action' && e.actionId === 'reset') setCount(0);
    if (e.type === 'select') {
      CarScreens.push({
        type: 'information',
        id: `detail-${e.itemId}`,
        title: 'Details',
        items: [{ title: 'Item', detail: e.itemId }],
      });
    }
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>react-native-car-screens</Text>
      <Text>Native module: {isSupported ? 'linked' : 'missing'}</Text>
      <Text>Car screen: {connected ? 'connected' : 'not connected'}</Text>
      <Text>Counter: {count}</Text>
      <View style={styles.row}>
        <Button title="+1" onPress={() => setCount((c) => c + 1)} />
        <Button
          title="Alert"
          onPress={() =>
            CarScreens.showAlert({
              id: 'hello',
              title: 'Hello from the phone',
              durationMs: 3000,
              actions: [{ id: 'ok', title: 'OK' }],
            })
          }
        />
      </View>
      <Text style={styles.title}>Events</Text>
      {log.map((line, i) => (
        <Text key={i} style={styles.log}>
          {line}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 80, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
  log: { fontFamily: 'Menlo', fontSize: 11 },
});
