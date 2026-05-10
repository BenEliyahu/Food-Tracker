import './App.css';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from './lib/firebase';
import * as db from './lib/db';
import type { UserProfile, TabType } from './lib/types';
import Login from './components/Login';
import Onboarding from './components/Onboarding';
import Navigation from './components/Navigation';
import Toast from './components/Toast';

const Dashboard  = lazy(() => import('./components/Dashboard'));
const FoodScanner = lazy(() => import('./components/FoodScanner'));
const MealLog    = lazy(() => import('./components/MealLog'));
const WeeklyChart = lazy(() => import('./components/WeeklyChart'));
const Profile    = lazy(() => import('./components/Profile'));

function TabSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<TabType>('dashboard');
  const [dashKey, setDashKey] = useState(0);
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await db.getProfile(u.uid);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });
  }, []);

  const handleComplete = useCallback((p: UserProfile) => {
    setProfile(p);
    if (user) {
      db.saveProfile(user.uid, p).catch(() =>
        toast('Failed to save profile. Check your connection.', 'error')
      );
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
      <Suspense fallback={<TabSpinner />}>
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
      </Suspense>
      <Navigation active={tab} onChange={setTab} />
    </div>
  );
}
