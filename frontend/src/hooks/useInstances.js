import { useState, useEffect } from 'react';
import instanceService from '../services/instanceService';

// Simple hook for healthy TES instances
const useInstances = () => {
  const [state, setState] = useState({
    instances: [],
    loading: true,
    error: null,
    lastUpdate: null
  });

  useEffect(() => {
    // Update state when service notifies of changes
    const handleUpdate = (newState) => {
      setState(newState);
    };

    // Add listener to service
    instanceService.addListener(handleUpdate);

    // Get initial state
    const initialState = instanceService.getHealthyInstances();
    setState(initialState);

    // Cleanup listener on unmount
    return () => {
      instanceService.removeListener(handleUpdate);
    };
  }, []);

  // Manual refresh function
  const refresh = () => {
    instanceService.refresh();
  };

  return {
    instances: state.instances,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    refresh,
    hasInstances: state.instances.length > 0
  };
};

export default useInstances;
