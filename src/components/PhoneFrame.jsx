export default function PhoneFrame({ children }) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="phone-frame-wrapper">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-status-bar">
          <span>{time}</span>
          <span>5G</span>
        </div>
        {children}
        <div className="phone-home-indicator" />
      </div>
    </div>
  );
}
