// Cloudflare Worker script to serve static content and handle code verification

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scavenger Hunt Check-in</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="container">
        <div id="event-code-section">
            <h1>Welcome to the Scavenger Hunt!</h1>
            <p>Enter your event code:</p>
            <input type="text" id="event-code-input" placeholder="Event code">
            <button onclick="saveEventCode()">Save Event Code</button>
            <div id="event-code-error"></div>
        </div>
        <div id="check-in-section" style="display: none;">
            <h1>Event: <span id="displayed-event-code"></span></h1>
            <p>Enter your 4-digit check-in code:</p>
            <input type="text" inputmode="numeric" id="code-input" maxlength="4" placeholder="4-digit code">
            <button onclick="checkCode()">Check-in</button>
            <div id="result"></div>
            <div id="total-points">Total Points: 0</div>
            <button onclick="changeEventCode()">Change Event Code</button>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const savedEventCode = localStorage.getItem('eventCode');
            if (savedEventCode) {
                showCheckInSection(savedEventCode);
            }
        });

        function saveEventCode() {
            const eventCode = document.getElementById('event-code-input').value.trim();
            if (eventCode) {
                localStorage.setItem('eventCode', eventCode);
                showCheckInSection(eventCode);
            } else {
                document.getElementById('event-code-error').innerHTML = \`<span style="color: red;">Please enter a valid event code.</span>\`;
            }
        }

        function showCheckInSection(eventCode) {
            document.getElementById('event-code-section').style.display = 'none';
            document.getElementById('check-in-section').style.display = 'block';
            document.getElementById('displayed-event-code').innerText = eventCode;
            updateTotalPoints(eventCode);
        }

        function changeEventCode() {
            localStorage.removeItem('eventCode');
            document.getElementById('event-code-section').style.display = 'block';
            document.getElementById('check-in-section').style.display = 'none';
        }

        async function checkCode() {
            const eventCode = localStorage.getItem('eventCode');
            const enteredCode = document.getElementById('code-input').value;
            const resultDiv = document.getElementById('result');

            if (!eventCode || enteredCode.length !== 4) {
                resultDiv.innerHTML = \`<span style="color: red;">Please enter a 4-digit check-in code.</span>\`;
                return;
            }

            const usedCodesKey = \`usedCodes_\${eventCode}\`;
            let usedCodes = JSON.parse(localStorage.getItem(usedCodesKey)) || [];

            if (usedCodes.includes(enteredCode)) {
                resultDiv.innerHTML = \`<span style="color: red;">This code has already been used. Please enter a different code.</span>\`;
                return;
            }

            try {
                resultDiv.innerHTML = \`<span style="color: blue;">Checking...</span>\`; // Show checking status

                const startTime = performance.now();

                const response = await fetch('/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ eventCode: eventCode, code: enteredCode })
                });

                const endTime = performance.now();
                const responseTime = endTime - startTime;
                const baseDelay = 500;
                const additionalDelay = responseTime > 500 ? responseTime - 500 : 0;
                const totalDelay = baseDelay + additionalDelay;

                setTimeout(async () => {
                    if (response.ok) {
                        const data = await response.json();
                        const totalPointsKey = \`totalPoints_\${eventCode}\`;
                        let totalPoints = localStorage.getItem(totalPointsKey) ? parseInt(localStorage.getItem(totalPointsKey)) : 0;

                        if (data.valid) {
                            totalPoints += data.points;
                            localStorage.setItem(totalPointsKey, totalPoints);

                            usedCodes.push(enteredCode);
                            localStorage.setItem(usedCodesKey, JSON.stringify(usedCodes));

                            resultDiv.innerHTML = \`<span style="color: green;">Code \${enteredCode} for event \${eventCode} is valid. You earned \${data.points} points!</span>\`;
                        } else {
                            resultDiv.innerHTML = \`<span style="color: red;">Code \${enteredCode} for event \${eventCode} is invalid. Try again.</span>\`;
                        }

                        document.getElementById('total-points').innerText = \`Total Points: \${totalPoints}\`;
                    } else {
                        const errorMessage = await response.text();
                        console.error('Error checking the code:', errorMessage);
                        resultDiv.innerHTML = \`<span style="color: red;">Error checking the code: \${errorMessage}</span>\`;
                    }
                }, totalDelay); // Dynamic delay based on response time

            } catch (error) {
                resultDiv.innerHTML = \`<span style="color: red;">Error checking the code. Please try again later.</span>\`;
                console.error('Fetch Error:', error);
            }
        }

        function updateTotalPoints(eventCode) {
            const totalPointsKey = \`totalPoints_\${eventCode}\`;
            let totalPoints = localStorage.getItem(totalPointsKey) ? parseInt(localStorage.getItem(totalPointsKey)) : 0;
            document.getElementById('total-points').innerText = \`Total Points: \${totalPoints}\`;
        }
    </script>
</body>
</html>
`;

const styles = `
body {
    font-family: Arial, sans-serif;
    background-color: #f0f8ff;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
}

.container {
    text-align: center;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

input[type="text"] {
    padding: 10px;
    margin-top: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

button {
    padding: 10px 20px;
    margin-top: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background-color: #0056b3;
}

#result {
    margin-top: 20px;
    font-size: 18px;
}
`;


const events = {
    'event1': {
        '1234': 10,
        '5678': 20,
    },
    'event2': {
        '9101': 15,
        '1121': 25,
    },
    'event3': {
        '3141': 30,
        '4151': 40,
    }
};

async function handleRequest(request) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    } else if (url.pathname === '/styles.css') {
        return new Response(styles, {
            headers: { 'Content-Type': 'text/css' }
        });
    } else if (url.pathname === '/verify') {
        if (request.method === 'POST') {
            const requestData = await request.json();
            const { eventCode, code } = requestData;

            if (!eventCode || !code) {
                return new Response('Missing event code or check-in code.', { status: 400 });
            }

            const eventCodes = events[eventCode];

            if (!eventCodes) {
                return new Response(JSON.stringify({ valid: false, points: 0 }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const points = eventCodes[code];

            if (points !== undefined) {
                return new Response(JSON.stringify({ valid: true, points: points }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({ valid: false, points: 0 }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else {
            return new Response('Method not allowed', { status: 405 });
        }
    } else {
        return new Response('Not found', { status: 404 });
    }
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
