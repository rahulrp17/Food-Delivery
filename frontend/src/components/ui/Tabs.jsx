import { useState } from 'react';
import React from 'react';

export function Tabs({ activeTab, onChange, children }) {
  const [internalTab, setInternalTab] = useState(activeTab);
  const currentTab = activeTab !== undefined ? activeTab : internalTab;

  const handleChange = (value) => {
    if (activeTab === undefined) setInternalTab(value);
    onChange?.(value);
  };

  return (
    <div className="tabs" data-active-tab={currentTab}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        if (child.type === TabList) {
          return React.cloneElement(child, { activeTab: currentTab, onChange: handleChange });
        }
        if (child.type === TabPanel) {
          return React.cloneElement(child, { activeTab: currentTab, value: child.props.value });
        }
        return child;
      })}
    </div>
  );
}

export function TabList({ children, activeTab, onChange }) {
  return (
    <div className="tab-list" role="tablist">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          isActive: child.props.value === activeTab,
          onClick: () => onChange(child.props.value),
        })
      )}
    </div>
  );
}

export function Tab({ value, children, isActive, onClick }) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      className={`tab ${isActive ? 'active' : ''}`}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children, activeTab }) {
  if (value !== activeTab) return null;
  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className="tab-panel"
    >
      {children}
    </div>
  );
}
