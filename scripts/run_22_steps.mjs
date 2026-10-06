async function runMission() {
  await fetch('http://localhost:8080/api/demo/mission/reset', { method: 'POST' });
  console.log('Reset complete. Stepping through 22 steps:');
  for (let i = 1; i <= 25; i++) {
    const res = await fetch('http://localhost:8080/api/demo/mission/step', { method: 'POST' });
    const data = await res.json();
    const lastEvent = data.events?.[data.events.length - 1];
    const name = lastEvent?.action || 'Unknown';
    const state = lastEvent?.state || data.state;
    const eventId = lastEvent?.event_id;
    const sim = lastEvent?.simulation_live;
    console.log(`[Step ${String(i).padStart(2, '0')}] ${eventId} | ${state} | ${name} | sim=${sim}`);
    if (state === 'COMPLETED' || data.state === 'COMPLETED') {
      console.log('\nFLAGSHIP MISSION COMPLETED SUCCESSFULLY IN 22 STEPS!');
      console.log(`Total events in mission: ${data.events.length}`);
      console.log(`Simulation safety mode: ${sim}`);
      break;
    }
  }
}
runMission().catch(e => { console.error(e); process.exit(1); });
