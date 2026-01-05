import React, { useEffect, useState, useRef, useCallback } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Review } from '../types';
import Reviews from '../components/review/Reviews';

const POLLING_INTERVAL_MS = 90000; // 90 seconds - optimized for cost savings

const DashboardReviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const mountedRef = useRef(true);

  const loadReviews = useCallback(async () => {
    if (!user?.id) return;

    try {
      const q = query(
        collection(db, 'reviews'),
        where('providerId', '==', user.id),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      if (!mountedRef.current) return;

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Review[];
      setReviews(data);
    } catch (error) {
      console.error('[DashboardReviews] Error loading reviews:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    loadReviews();

    // Polling every 90 seconds instead of real-time onSnapshot
    const intervalId = setInterval(loadReviews, POLLING_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [loadReviews]);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Mes avis clients</h2>
      <Reviews reviews={reviews} mode="list" />
    </div>
  );
};

export default DashboardReviews;


