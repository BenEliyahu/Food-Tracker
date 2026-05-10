import './App.css';
import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './lib/firebase';
import * as db from './lib/db';
import type { UserProfile, TabType } from './lib/types';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import FoodScanner from './components/FoodScanner';
import MealLog from './components/MealLog';
import WeeklyChart from './components/WeeklyChart';
import Profile from './components/Profile';
import Toast from './components/Toast';

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<TabType>('dashboard');
  const [dashKey, setDashKey] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await db.getProfile(u.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
  }, []);

  const handleComplete = useCallback((p: UserProfile) => {
    setProfile(p);
    if (user) {
      db.saveProfile(user.uid, p).catch(e => console.error('Failed to save profile:', e));
    }
  }, [user]);

  const handleMealAdded = useCallback(() => {
    setDashKey(k => k + 1);
    setTab('dashboard');
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-emerald-500 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <><Toast /><Login /></>;
  if (!profile) return <><Toast /><Onboarding onComplete={handleComplete} /></>;

  return (
    <div className="max-w-md mx-auto min-h-screen relative bg-gray-50">
      <Toast />
      <div key={tab} className="page-enter">
        {tab === 'dashboard' && <Dashboard key={dashKey} uid={user.uid} profile={profile} />}
        {tab === 'scan'      && <FoodScanner uid={user.uid} onMealAdded={handleMealAdded} />}
        {tab === 'log'       && <MealLog key={dashKey} uid={user.uid} />}
        {tab === 'charts'    && <WeeklyChart uid={user.uid} profile={profile} />}
        {tab === 'profile'   && (
          <Profile
            uid={user.uid}
            profile={profile}
            onUpdate={p => { setProfile(p); setDashKey(k => k + 1); }}
            onSignOut={() => signOut(auth)}
          />
        )}
      </div>
      <Navigation active={tab} onChange={setTab} />
    </div>
  );
}
