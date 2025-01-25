
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
    <div class="link-container">
        <a href="/help.html">Help</a>
        <a href="/leaderboard.html">Leaderboard</a>
        <a href="#" id="theme-toggle">Dark Mode 🌒</a>
    </div>
    <div class="container">
        <div id="event-code-section">
            <h1><i>Scavenger Hunt</i></h1>
            <p>Enter your event code:</p>
            <input type="text" id="event-code-input" placeholder="Event code" name="eventCodeParam">
            <p>Enter your team name:</p>
            <input type="text" id="team-name-input" placeholder="Team name">
            <button onclick="saveEventCode()">Save</button>
            <div id="event-code-error"></div>
        </div>
        <div id="check-in-section" style="display: none;">
            <h1>Event: <span id="displayed-event-code"></span></h1>
            <p>Team: <span id="displayed-team-name"></span></p> <div id="team-name-error"></div>
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
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
            }
            const savedTeamName = localStorage.getItem('teamName');
            if (savedTeamName) {
                document.getElementById('team-name-input').value = savedTeamName;
            }
        });

        const themeToggle = document.getElementById('theme-toggle');

        themeToggle.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior

            document.body.classList.toggle('dark-mode');

            // Update the link text based on the current mode
            if (document.body.classList.contains('dark-mode')) {
                themeToggle.textContent = 'Light Mode ☀️';
            } else {
                themeToggle.textContent = 'Dark Mode 🌒';
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const eventCodeParam = urlParams.get('event');
        // Populate the form field
        if (eventCodeParam) {
            document.getElementById('event-code-input').value = eventCodeParam;
        }

        function saveEventCode() {
            const eventCode = document.getElementById('event-code-input').value.trim();
            const teamName = document.getElementById('team-name-input').value.trim();
            if (eventCode && teamName) {
                localStorage.setItem('eventCode', eventCode);
                localStorage.setItem('teamName', teamName);
                showCheckInSection(eventCode, teamName);
            } else {
                document.getElementById('event-code-error').innerHTML = '<span style="color: red;">Please enter a valid event code and team name.</span>';
            }
        }

        function showCheckInSection(eventCode) {
            const teamName = localStorage.getItem('teamName'); // Retrieve team name here
            document.getElementById('event-code-section').style.display = 'none';
            document.getElementById('check-in-section').style.display = 'block';
            document.getElementById('displayed-event-code').innerText = eventCode;
            document.getElementById('displayed-team-name').innerText = teamName;
            updateTotalPoints(eventCode);
        }

        function changeEventCode() {
            localStorage.removeItem('eventCode');
            localStorage.removeItem('teamName');
            document.getElementById('event-code-section').style.display = 'block';
            document.getElementById('check-in-section').style.display = 'none';
        }

        async function checkCode() {
            const eventCode = localStorage.getItem('eventCode');
            const enteredCode = document.getElementById('code-input').value;
            const resultDiv = document.getElementById('result');
            const teamName = localStorage.getItem('teamName'); // Get team name for leaderboard

            if (!eventCode || enteredCode.length !== 4) {
                resultDiv.innerHTML = '<span style="color: red;">Please enter a 4-digit check-in code.</span>';
                return;
            }

            const usedCodesKey = \`usedCodes_\${eventCode}\`;
            let usedCodes = JSON.parse(localStorage.getItem(usedCodesKey)) || [];

            if (usedCodes.includes(enteredCode)) {
                resultDiv.innerHTML = '<span style="color: red;">This code has already been used. Please enter a different code.</span>';
                return;
            }

            try {
                resultDiv.innerHTML = '<span style="color: blue;">Checking...</span>';

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

                            resultDiv.innerHTML = '<span style="color: green;">Code ' + enteredCode + ' for event ' + eventCode + ' is valid. You earned ' + data.points + ' points!</span>';

                            await updateLeaderboard(eventCode, teamName, totalPoints); // Update leaderboard after points are awarded

                        } else {
                            resultDiv.innerHTML = '<span style="color: red;">Code ' + enteredCode + ' for event ' + eventCode + ' is invalid. Try again.</span>';
                        }

                        document.getElementById('total-points').innerText = \`Total Points: \${totalPoints}\`;
                    } else {
                        const errorMessage = await response.text();
                        console.error('Error checking the code:', errorMessage);
                        resultDiv.innerHTML = '<span style="color: red;">Error checking the code: ' + errorMessage + '</span>';
                    }
                }, totalDelay);

            } catch (error) {
                resultDiv.innerHTML = '<span style="color: red;">Error checking the code. Please try again later.</span>';
                console.error('Fetch Error:', error);
            }
        }

        function updateTotalPoints(eventCode) {
            const totalPointsKey = \`totalPoints_\${eventCode}\`;
            let totalPoints = localStorage.getItem(totalPointsKey) ? parseInt(localStorage.getItem(totalPointsKey)) : 0;
            document.getElementById('total-points').innerText = \`Total Points: \${totalPoints}\`;
        }

        async function updateLeaderboard(eventCode, teamName, totalPoints) {
            try {
                const response = await fetch('/api/leaderboard/update', { // Call API endpoint to update leaderboard
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ eventCode: eventCode, teamName: teamName, totalPoints: totalPoints })
                });
                if (!response.ok) {
                    console.error('Failed to update leaderboard via API:', response.statusText);
                }
            } catch (error) {
                console.error('Error updating leaderboard via API:', error);
            }
        }


    </script>
</body>
</html>
`;

const leaderboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale: 1.0">
    <title>Scavenger Hunt Leaderboard</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="link-container">
        <a href="/help.html">Help</a>
        <a href="/index.html">← Back to Check-in</a>
        <a href="#" id="theme-toggle-leaderboard">Dark Mode 🌒</a>
    </div>
    <div class="container">
        <h1>Leaderboard</h1>
        <div id="leaderboard-event-select" style="display:none;">
            <label for="event-code-select">Select Event: </label>
            <input type="text" id="event-code-select" placeholder="Enter Event Code">
            <button onclick="loadLeaderboard()">Load Leaderboard</button>
            <div id="leaderboard-error" style="color: red;"></div>
        </div>
        <div id="leaderboard-section" style="display: none;">
            <h2>Event: <span id="leaderboard-displayed-event-code"></span></h2>
            <div id="leaderboard-update-countdown">Next update in <span id="countdown-timer"></span> seconds...</div>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team Name</th>
                        <th>Points</th>
                    </tr>
                </thead>
                <tbody id="leaderboard-table-body">
                    <!-- Leaderboard rows will be inserted here by JavaScript -->
                </tbody>
            </table>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
            }
            const savedEventCode = localStorage.getItem('eventCode');
            if (savedEventCode) {
                document.getElementById('leaderboard-event-select').style.display = 'none';
                document.getElementById('leaderboard-section').style.display = 'block';
                document.getElementById('leaderboard-displayed-event-code').innerText = savedEventCode;
                localStorage.setItem('leaderboardEventCode', savedEventCode); // Ensure event code is stored for updates
                loadLeaderboard(savedEventCode); // Load leaderboard immediately
            } else {
                document.getElementById('leaderboard-event-select').style.display = 'block'; // Show event select if no event code
                document.getElementById('leaderboard-section').style.display = 'none';
            }
        });

        const themeToggleLeaderboard = document.getElementById('theme-toggle-leaderboard');

        themeToggleLeaderboard.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default link behavior

            document.body.classList.toggle('dark-mode');

            // Update the link text based on the current mode
            if (document.body.classList.contains('dark-mode')) {
                themeToggleLeaderboard.textContent = 'Light Mode ☀️';
            } else {
                themeToggleLeaderboard.textContent = 'Dark Mode 🌒';
            }
        });

        let updateInterval;
        let countdownInterval;
        let countdownValue = 10;

        function startCountdown() {
            countdownValue = 10;
            document.getElementById('countdown-timer').textContent = countdownValue;
            countdownInterval = setInterval(() => {
                countdownValue--;
                document.getElementById('countdown-timer').textContent = countdownValue;
                if (countdownValue <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);
        }


        function loadLeaderboard(eventCode) {
            if (!eventCode) {
                eventCode = document.getElementById('event-code-select').value.trim(); // Get from input if not passed as argument
            }
            if (eventCode) {
                localStorage.setItem('leaderboardEventCode', eventCode); // Store event code for updates
                document.getElementById('leaderboard-displayed-event-code').innerText = eventCode;
                document.getElementById('leaderboard-event-select').style.display = 'none';
                document.getElementById('leaderboard-section').style.display = 'block';
                updateLeaderboardDisplay(eventCode);
                clearInterval(updateInterval); // Clear any existing interval
                updateInterval = setInterval(() => updateLeaderboardDisplay(eventCode), 10000); // Set interval for automatic updates every 10 seconds
                startCountdown(); // Initial countdown start
            } else {
                document.getElementById('leaderboard-error').innerText = 'Please enter an event code to view the leaderboard.';
            }
        }


        async function updateLeaderboardDisplay(eventCode) {
            startCountdown(); // Restart countdown on each update
            try {
                // Fetch leaderboard data from API endpoint /api/leaderboard/get
                const response = await fetch(\`/api/leaderboard/get?eventCode=\${eventCode}\`);
                if (!response.ok) {
                    // If the response status is not OK (200), throw an error
                    throw new Error(\`HTTP error! status: \${response.status}, message: \${response.statusText}\`);
                }
                // Parse the JSON response from the API
                const leaderboardData = await response.json();
                const tableBody = document.getElementById('leaderboard-table-body');
                tableBody.innerHTML = ''; // Clear existing table rows before adding new ones

                if (leaderboardData.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="3">No teams have checked in yet for this event.</td></tr>';
                    return;
                }

                // Iterate through the leaderboard data and create table rows
                leaderboardData.forEach((team, index) => {
                    const row = tableBody.insertRow();
                    const rankCell = row.insertCell();
                    const teamNameCell = row.insertCell();
                    const pointsCell = row.insertCell();
                    rankCell.textContent = index + 1; // Rank is the index + 1
                    teamNameCell.textContent = team.teamName; // Team name from the data
                    pointsCell.textContent = team.points;     // Points from the data
                });
            } catch (error) {
                console.error("Error fetching leaderboard data from API:", error);
                // Display a user-friendly error message in the leaderboard table
                document.getElementById('leaderboard-table-body').innerHTML = '<tr><td colspan="3" style="color: red;">Error loading leaderboard. Please try again.</td></tr>';
            }
        }


    </script>
</body>
</html>
`;


const privacy = `
<!DOCTYPE html>
<html lang="en">
<a href="/index.html">← Back</a>
<p>No user data is obtained through the use of this service.<br>Cookies are used to store check-in codes and score across browser sessions for a given event - these never leave your device.</p>
<p>This service is hosted on Cloudflare Workers. To prevent mis-use, Cloudflare may place cookies to determine whether you are a bot or not. You can find their privacy policy here: <a href="https://www.cloudflare.com/en-gb/privacypolicy/">https://www.cloudflare.com/en-gb/privacypolicy/</a></p>
</html>
`;

const help = `
<!DOCTYPE html>
<html lang="en">
<a href="/index.html">← Back</a>
<p>Using the map you have been provided with, go to the checkpoints and enter the check-in codes. This will add the relevant number of points to your total.</p>
</html>
`;

const styles = `
body {
    font-family: sans-serif;
    background-color: #CECECE;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    transition: background-color 0.3s ease, color 0.3s ease; /* Add transition for smooth change */
}

/* Dark mode styles */
body.dark-mode {
    background-color: #121212;
    color: #e0e0e0;
}

.container {
    text-align: center;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease, color 0.3s ease; /* Add transition */
    max-width: 800px; /* Added max-width for better readability on larger screens */
    width: 100%; /* Ensure it takes full width of its container */
    box-sizing: border-box; /* Include padding and border in the element's total width and height */
}

body.dark-mode .container {
    background-color: #242424;
    color: #e0e0e0;
}

input[type="text"] {
    padding: 10px;
    margin-top: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: calc(100% - 22px); /* Adjust width to account for padding and border */
    box-sizing: border-box; /* To include padding and border in width */
    max-width: 300px; /* Maximum width for input fields */
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

.link-container {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 100;
}

/* Style the links in the link-container */
.link-container a {
    margin-right: 10px;
    color: #007bff; /* Default link color */
    transition: color 0.3s ease; /* Add transition for smooth color change */
    text-decoration: none; /* Remove underline from links */
}

/* Change link color in dark mode */
body.dark-mode .link-container a {
    color: #99ccff; /* Example light blue color for better contrast */
}

/* Leaderboard Styles */
#leaderboard-section table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

#leaderboard-section th, #leaderboard-section td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

#leaderboard-section th {
    background-color: #f4f4f4;
}

body.dark-mode #leaderboard-section th {
    background-color: #333;
    color: #e0e0e0;
    border-color: #555;
}
body.dark-mode #leaderboard-section td {
    border-color: #555;
}


#leaderboard-event-select {
    margin-bottom: 20px;
}

#leaderboard-event-select input[type="text"] {
    width: calc(50% - 22px); /* Adjust width for event code input on leaderboard page */
    max-width: 200px;
    display: inline-block; /* Keep input and button on the same line */
    margin-right: 10px;
}

#leaderboard-event-select button {
    display: inline-block; /* Keep input and button on the same line */
}

#leaderboard-update-countdown {
    margin-top: 10px;
    font-size: 0.9em;
    color: #777;
}

body.dark-mode #leaderboard-update-countdown {
    color: #999;
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

async function handleRequest(request, env) { // Add 'env' to the handleRequest function
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    } else if (url.pathname === '/styles.css') {
        return new Response(styles, {
            headers: { 'Content-Type': 'text/css' }
        });
    } else if (url.pathname === '/privacy.html') {
        return new Response(privacy, {
            headers: { 'Content-Type': 'text/html' }
        });
    } else if (url.pathname === '/help.html') {
        return new Response(help, {
            headers: { 'Content-Type': 'text/html' }
        });
    } else if (url.pathname === '/leaderboard.html') {
        return new Response(leaderboardHTML, {
            headers: { 'Content-Type': 'text/html' }
        });
    } else if (url.pathname === '/api/leaderboard/get') { // API endpoint to GET leaderboard data
        const eventCode = url.searchParams.get('eventCode');
        if (!eventCode) {
            return new Response('Missing eventCode parameter', { status: 400 });
        }
        try {
            // Query D1 database to get leaderboard data for the given eventCode
            const { results } = await env.MY_DB.prepare(`
                SELECT teamName, points FROM leaderboard WHERE eventCode = ? ORDER BY points DESC
            `).bind(eventCode).all();

            // Return the leaderboard data as JSON response
            return new Response(JSON.stringify(results), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error fetching leaderboard data from D1:', error);
            // Return an error response if fetching from D1 fails
            return new Response('Error fetching leaderboard data from D1', { status: 500 });
        }
    } else if (url.pathname === '/api/leaderboard/update') { // API endpoint to UPDATE leaderboard data
        if (request.method === 'POST') {
            try {
                const requestData = await request.json();
                const { eventCode, teamName, totalPoints } = requestData;
                if (!eventCode || !teamName) {
                    return new Response('Missing eventCode or teamName in request', { status: 400 });
                }

                // Insert or replace leaderboard data in D1 database
                await env.MY_DB.prepare(`
                    INSERT OR REPLACE INTO leaderboard (eventCode, teamName, points)
                    VALUES (?, ?, ?)
                `).bind(eventCode, teamName, totalPoints).run();


                return new Response(JSON.stringify({ message: 'Leaderboard updated successfully' }), {
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (error) {
                console.error('Error updating leaderboard in D1:', error);
                return new Response('Error updating leaderboard in D1', { status: 500 });
            }
        } else {
            return new Response('Method not allowed', { status: 405 });
        }
    }
     else if (url.pathname === '/verify') {
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

export default {
    fetch(request, env, ctx) { // Export fetch function, receive env and ctx
        return handleRequest(request, env); // Call handleRequest with request and env
    },
};
