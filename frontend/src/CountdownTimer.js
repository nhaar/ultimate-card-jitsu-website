import React from 'react';
import DateTimeDisplay from './DateTimeDisplay';
import { useCountdown } from './hooks/useCountdown';

const ExpiredNotice = () => {
    return (
        <div className="expired-notice">
            <meta http-equiv="refresh" content="1"/>
        </div>
    );
};

const ShowCounter = ({ days, hours, minutes, seconds }) => {
    return (
        <div className="show-counter" style={{
            textAlign: 'center',
            margin: 'auto'
        }}>
            <DateTimeDisplay value={days} type={days == 1 ? 'Day' : 'Days'} isDanger={false} />, <DateTimeDisplay value={hours} type={hours == 1 ? 'Hour' : 'Hours'} isDanger={false} />, <DateTimeDisplay value={minutes} type={minutes == 1 ? 'Minute' : 'Minutes'} isDanger={false} />, <DateTimeDisplay value={seconds} type={seconds == 1 ? 'Second' : 'Seconds'} isDanger={false} />
        </div>
    );
};

const CountdownTimer = ({ targetDate }) => {
    const [days, hours, minutes, seconds] = useCountdown(targetDate);

    if (days + hours + minutes + seconds <= 0) {
        return <ExpiredNotice />;
    } else {
        return (
            <ShowCounter
                days={days}
                hours={hours}
                minutes={minutes}
                seconds={seconds}
            />
        );
    }
};

export default CountdownTimer;