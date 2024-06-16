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
        <h1>Welcome to the Scavenger Hunt!</h1>
        <p>Enter the 4-digit code from your current location:</p>
        <input type="text" id="code-input" maxlength="4" placeholder="4-digit code">
        <button onclick="checkCode()">Check-in</button>
        <div id="result"></div>
        <div id="total-points">Total Points: 0</div>
    </div>
    <script>
    async function checkCode() {
        const enteredCode = document.getElementById('code-input').value;
        const resultDiv = document.getElementById('result');
    
        if (enteredCode.length !== 4) {
            resultDiv.innerHTML = \`<span style="color: red;">Please enter a 4-digit code.</span>\`;
            return;
        }
    
        try {
            resultDiv.innerHTML = \`<span style="color: blue;">Checking...</span>\`; // Show checking status
    
            const response = await fetch('/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: enteredCode })
            });
    
            // Add a delay before showing the result
            setTimeout(async () => {
                if (response.ok) {
                    const data = await response.json();
                    let totalPoints = localStorage.getItem('totalPoints') ? parseInt(localStorage.getItem('totalPoints')) : 0;
    
                    if (data.valid) {
                        totalPoints += data.points;
                        localStorage.setItem('totalPoints', totalPoints);
                        resultDiv.innerHTML = \`<span style="color: green;">Code \${enteredCode} is valid. You earned \${data.points} points!</span>\`;
                    } else {
                        resultDiv.innerHTML = \`<span style="color: red;">Code \${enteredCode} is invalid. Try again.</span>\`;
                    }
    
                    document.getElementById('total-points').innerText = \`Total Points: \${totalPoints}\`;
                } else {
                    const errorMessage = await response.text();
                    console.error('Error checking the code:', errorMessage);
                    resultDiv.innerHTML = \`<span style="color: red;">Error checking the code: \${errorMessage}</span>\`;
                }
            }, 1000); // 500 milliseconds delay
    
        } catch (error) {
            resultDiv.innerHTML = \`<span style="color: red;">Error checking the code. Please try again later.</span>\`;
            console.error('Fetch Error:', error);
        }
    }
    </script>
</body>
</html>
`;

const styles = `
/* styles.css */
body {
    font-family: Arial, sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f8ff;
    margin: 0;
}

.container {
    text-align: center;
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

input {
    font-size: 18px;
    padding: 10px;
    margin: 10px 0;
    width: 150px;
    text-align: center;
    border: 2px solid #ccc;
    border-radius: 4px;
}

button {
    font-size: 18px;
    padding: 10px 20px;
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

// Define the valid 4-digit codes and their corresponding point values
const codePoints = {
    '1234': 10,
    '5678': 20,
    '9101': 15,
    '1121': 25,
    '3141': 30
};

// Cloudflare Worker handler function
async function handleRequest(request) {
    const url = new URL(request.url);

    // Serve different assets based on the URL path
    if (url.pathname === '/' || url.pathname === '/index.html') {
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    } else if (url.pathname === '/styles.css') {
        return new Response(styles, {
            headers: { 'Content-Type': 'text/css' }
        });
    } else if (url.pathname === '/verify') {
        // Handle code verification logic
        if (request.method === 'POST') {
            try {
                const reqBody = await request.json();
                const { code } = reqBody;

                console.log('Received code:', code);  // Log received code

                const isValid = code in codePoints;
                const points = isValid ? codePoints[code] : 0;

                const responseBody = {
                    valid: isValid,
                    points: points
                };

                console.log('Response body:', responseBody);  // Log response body

                return new Response(JSON.stringify(responseBody), {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'  // For development; restrict in production
                    }
                });
            } catch (error) {
                console.error('Error processing request:', error);  // Log errors
                return new Response('Invalid request', { status: 400 });
            }
        }
        return new Response('Method Not Allowed', { status: 405 });
    } else {
        return new Response('Not Found', { status: 404 });
    }
}

// Event listener to handle fetch events
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
