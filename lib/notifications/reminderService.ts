import { LocalNotifications } from '@capacitor/local-notifications';

export async function scheduleDailyGoalReminder(goalId: string, goalTitle: string, time24h: string) {
  const [hours, minutes] = time24h.split(':').map(Number);

  // Request permission
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return;

  await LocalNotifications.schedule({
    notifications: [
      {
        title: "GoalCircle Reminder 🎯",
        body: `Time to complete your habit: "${goalTitle}"!`,
        id: Math.abs(hashCode(goalId)),
        schedule: {
          on: { hour: hours, minute: minutes },
          repeats: true,
          allowWhileIdle: true,
        },
        sound: undefined,
        attachments: undefined,
        actionTypeId: "",
        extra: { goalId }
      }
    ]
  });
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}