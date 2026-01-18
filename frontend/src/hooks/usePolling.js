import { useEffect, useRef, useState } from 'react';

export const usePolling = (fetchFunction, interval = 5000, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        if (err.response?.status === 504 || 
            err.code === 'ECONNABORTED' || 
            (err.message && err.message.includes('timeout'))) {
          console.warn('External service timeout (expected with slow TES instances):', err.message);
          if (!data) {
            setError(new Error('Some external services are responding slowly. Data may be incomplete.'));
          }
        } else if (err.response?.status === 503) {
          console.warn('External service temporarily unavailable:', err.message);
          if (!data) {
            setError(new Error('Some external services are temporarily unavailable. Data may be incomplete.'));
          }
        } else {
          setError(err);
          console.error('Critical polling error:', err);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const startPolling = () => {
    fetchData();
    intervalRef.current = setInterval(fetchData, interval);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const restartPolling = () => {
    stopPolling();
    startPolling();
  };

  useEffect(() => {
    isMountedRef.current = true;
    startPolling();

    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, dependencies);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    startPolling,
    stopPolling,
    restartPolling
  };
};

export default usePolling;
