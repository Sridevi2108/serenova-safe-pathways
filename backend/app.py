# --- Imports ---
from flask import Flask, request, jsonify, render_template, abort
from flask_cors import CORS
import sqlite3
import hashlib
import osmnx as ox
import networkx as nx
import folium
import requests
import os
import pandas as pd
import urllib.parse
from werkzeug.exceptions import HTTPException
import geopandas as gpd
import traceback
from dotenv import load_dotenv
import os
# --- (Add near top imports if not already there) ---
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import traceback # Ensure traceback is imported
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import traceback
import os
import joblib # To load saved model/features
# Required for spatial features (install scipy)
from scipy.spatial import KDTree
from models.threat_model import (
    predict_text_threat,
    predict_image_threat,
    predict_audio_threat,
    predict_risk_level
)
from werkzeug.utils import secure_filename
# Load environment variables from the .env file
load_dotenv()

# --- App Initialization ---
app = Flask(__name__)
CORS(app)  
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

twilio_client = None # Initialize as None first
if ACCOUNT_SID and AUTH_TOKEN: # Check if essential credentials exist
    try:
        twilio_client = Client(ACCOUNT_SID, AUTH_TOKEN) # Assign to the variable
        print("Twilio client initialized successfully.")
        if not TWILIO_NUMBER:
             print("WARNING: TWILIO_PHONE_NUMBER not found in environment. SMS cannot be sent.")
    except Exception as e:
        print(f"CRITICAL ERROR: Failed to initialize Twilio client: {e}")
        # Depending on requirements, you might want the app to fail here
        # Or just log the error and continue without Twilio functionality
else:
    # Give specific feedback if SID or Token are missing
    missing = [v for v in ['SID', 'TOKEN'] if not globals()[f"TWILIO_{v}"]]
    print(f"WARNING: Twilio credentials ({', '.join(missing)}) not found. SMS/WhatsApp alerts disabled.")
    if not TWILIO_NUMBER: print("WARNING: TWILIO_PHONE_NUMBER also not found.")
# Connect to SQLite
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    # Enable foreign key constraints for this connection
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

# Create tables if not exists (Corrected Schema)
def create_tables():
    conn = get_db_connection()
    cursor = conn.cursor() # Use cursor for multiple executes

    # Updated users table (removed emergency contact fields)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone_number TEXT
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,  -- <<< ADDED user_id column
            route_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comments TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE -- <<< ADDED Foreign Key
        );
    ''')

    # New emergency_contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            number TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
    ''') # ON DELETE CASCADE means if a user is deleted, their contacts are also deleted.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            author_name TEXT NOT NULL, -- Store "Anonymous" or user's actual name
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            likes INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id) -- Link to the user who posted
        );
    ''')
    conn.commit()
    conn.close()

# Ensure tables are created on startup with the correct schema
create_tables()

# --- Utility Functions ---

# Utility to hash password
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# --- Authentication Routes ---

# Register API (Corrected for multiple contacts)
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    full_name = data.get('fullName')
    email = data.get('email')
    password = data.get('password')
    phone_number = data.get('phoneNumber') # Optional field
    emergency_contacts = data.get('emergencyContacts') # Expect list

    # --- Input Validation ---
    if not (full_name and email and password):
        return jsonify({'error': 'Missing required fields: Full Name, Email, Password'}), 400

    if not isinstance(emergency_contacts, list) or not emergency_contacts:
         return jsonify({'error': 'Emergency Contacts must be provided as a non-empty list'}), 400

    for contact in emergency_contacts:
        if not isinstance(contact, dict) or not contact.get('name') or not contact.get('number'):
            return jsonify({'error': 'Each emergency contact must have a non-empty name and number'}), 400
    # --- End Validation ---

    hashed_password = hash_password(password)
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Insert user data
        cursor.execute('''
            INSERT INTO users (full_name, email, password, phone_number)
            VALUES (?, ?, ?, ?)
        ''', (full_name, email, hashed_password, phone_number))
        user_id = cursor.lastrowid # Get the ID of the newly inserted user

        # Insert emergency contacts
        contact_tuples = [
            (user_id, contact.get('name'), contact.get('number'))
            for contact in emergency_contacts
        ]
        cursor.executemany('''
            INSERT INTO emergency_contacts (user_id, name, number)
            VALUES (?, ?, ?)
        ''', contact_tuples)

        conn.commit() # Commit transaction only if all inserts succeed
        return jsonify({'message': 'User registered successfully'}), 201

    except sqlite3.IntegrityError as e:
        if conn: conn.rollback() # Rollback the transaction
        print(f"Integrity Error: {e}") # Log the error server-side
        # Check if the error message indicates a duplicate email
        if 'UNIQUE constraint failed: users.email' in str(e):
             return jsonify({'error': 'Email address already registered'}), 409
        else:
             return jsonify({'error': 'Database integrity error occurred'}), 500 # Other integrity error
    except Exception as e:
        if conn: conn.rollback() # Rollback on any other error
        print(f"Registration Error: {e}") # Log the specific error
        return jsonify({'error': 'An error occurred during registration.'}), 500
    finally:
        if conn: conn.close()

# Login API (Corrected to return user ID)
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
         return jsonify({'error': 'Email and password required'}), 400

    hashed_password = hash_password(password)
    conn = get_db_connection()
    # Select specific fields needed by frontend after login (like user ID)
    user = conn.execute('SELECT id, full_name FROM users WHERE email = ? AND password = ?',
                        (email, hashed_password)).fetchone()
    conn.close()

    if user:
        # Return user info needed by frontend (avoid sending password hash)
        return jsonify({
            'message': 'Login successful',
            'user': dict(user) # Send user ID and name
        }), 200
    else:
        return jsonify({'error': 'Invalid email or password'}), 401

# --- Data Loading ---
# Load the nationwide dataset ONCE when the app starts
nationwide_data_path = "processed_crime_data.csv" # Make sure this file is in the same directory or provide the correct path
df = None # Initialize dataframe as None

try:
    print(f"Attempting to load nationwide data from: {nationwide_data_path}")
    df = pd.read_csv(nationwide_data_path, encoding='utf-8', low_memory=False)
    # --- Data Cleaning (Essential) ---
    # 1. Strip whitespace from column names
    df.columns = df.columns.str.strip()
    print(f"Successfully loaded nationwide data. Shape: {df.shape}")
    print(f"Columns found: {list(df.columns)}")

    # 2. Check for essential 'DISTRICT' column
    if 'DISTRICT' not in df.columns:
        raise ValueError("Dataset is missing the required 'DISTRICT' column.")

    # 3. Standardize the DISTRICT column for reliable matching later
    # Convert to string, strip whitespace, convert to uppercase
    # Handle potential errors during conversion (e.g., if data isn't string convertible)
    try:
         df['DISTRICT_STANDARDIZED'] = df['DISTRICT'].astype(str).str.strip().str.upper()
    except Exception as e:
         print(f"Warning: Could not standardize DISTRICT column fully: {e}")
         # Fallback: create the column even if some conversions failed
         if 'DISTRICT' in df.columns and 'DISTRICT_STANDARDIZED' not in df.columns:
              df['DISTRICT_STANDARDIZED'] = df['DISTRICT'].astype(str).fillna('').str.strip().str.upper()


    # --- !! Important: Verify Columns for Score Calculation !! ---
    # Define the columns YOU need from your CSV to calculate the safety score.
    # This is an EXAMPLE - REPLACE with actual column names from your CSV.
    required_score_columns = ['Murder', 'Theft', 'Robbery'] # <--- *** USER ACTION NEEDED ***
    # ---------------------------------------------------------------------

    missing_cols = [col for col in required_score_columns if col not in df.columns]
    if missing_cols:
        print(f"WARNING: Dataset is missing columns needed for score calculation: {missing_cols}. Safety scores may be inaccurate or fail.")
        # You might want to raise an error or handle this more strictly depending on requirements
        # raise ValueError(f"Dataset missing required score columns: {missing_cols}")

    # Convert required score columns to numeric, coercing errors and filling NaNs
    # This helps prevent calculation errors later.
    for col in required_score_columns:
        if col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
                print(f"Converted column '{col}' to numeric.")
            except Exception as e:
                print(f"Warning: Could not convert score column '{col}' to numeric: {e}. Calculation might fail.")
        else:
             # If a required column is missing after warning, create it with zeros to prevent later errors
             # This assumes a score of 0 for missing data types, adjust if needed
             print(f"Creating missing required score column '{col}' with default value 0.")
             df[col] = 0


except FileNotFoundError:
    print(f"CRITICAL ERROR: Nationwide dataset file not found at '{nationwide_data_path}'.")
    print("Please ensure the file exists and the path is correct.")
    df = pd.DataFrame(columns=['DISTRICT', 'DISTRICT_STANDARDIZED']) # Create empty df
except ValueError as ve:
    print(f"CRITICAL ERROR: Problem with dataset structure: {ve}")
    df = pd.DataFrame(columns=['DISTRICT', 'DISTRICT_STANDARDIZED']) # Create empty df
except Exception as e:
    print(f"CRITICAL ERROR: An unexpected error occurred loading the dataset: {e}")
    traceback.print_exc()
    df = pd.DataFrame(columns=['DISTRICT', 'DISTRICT_STANDARDIZED']) # Create empty df


# --- API Endpoints ---

@app.route('/api/districts', methods=['GET'])
def get_districts():
    """Returns a sorted list of unique district names from the dataset."""
    if df is None or df.empty or 'DISTRICT_STANDARDIZED' not in df.columns:
        print("Error fetching districts: DataFrame not loaded or 'DISTRICT_STANDARDIZED' column missing.")
        return jsonify({'error': 'District data is unavailable or not loaded correctly.'}), 503 # Service Unavailable

    try:
        # Use the standardized column for uniqueness and sorting
        districts = sorted(df['DISTRICT_STANDARDIZED'].dropna().unique().tolist())
        # Optional: Filter out empty strings if any resulted from standardization errors
        districts = [d for d in districts if d]
        print(f"Returning {len(districts)} unique districts.")
        return jsonify(districts)
    except Exception as e:
        print(f"Error processing districts list: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Error generating districts list: {str(e)}'}), 500


# ... (other parts of your Flask app: initialization, other routes, etc.) ...

@app.route('/api/safety_score', methods=['POST'])
def get_safety_score():
    """
    Calculates a safety score for one or more districts based on the loaded nationwide data.
    Accepts JSON: {'district': 'DISTRICT_NAME'} OR {'districts': ['NAME1', 'NAME2']}
    """
    # Check if DataFrame is loaded
    if df is None or df.empty:
        print("Safety score request failed: DataFrame not loaded.")
        return jsonify({'error': 'Safety score data source is unavailable.'}), 503

    # Get data from request
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request format. JSON body expected.'}), 400

    # --- Determine Target Districts ---
    target_districts_input = data.get('districts') # List preferred by frontend workaround
    single_district_input = data.get('district') # Single district for direct calls/testing

    target_districts_std = [] # Standardized (uppercase, trimmed) names
    if target_districts_input and isinstance(target_districts_input, list):
         target_districts_std = [str(d).upper().strip() for d in target_districts_input if isinstance(d, str) and d.strip()]
    elif single_district_input and isinstance(single_district_input, str) and single_district_input.strip():
         target_districts_std = [single_district_input.upper().strip()]

    if not target_districts_std:
         return jsonify({'error': 'No valid district name(s) provided in "district" or "districts" key.'}), 400

    print(f"Received safety score request for districts: {target_districts_std}")

    # --- Score Calculation ---
    try:
        # Ensure standardized district column exists
        if 'DISTRICT_STANDARDIZED' not in df.columns:
             print("Error: DISTRICT_STANDARDIZED column missing from DataFrame.")
             return jsonify({'error': 'Internal server error: District data configuration issue.'}), 500

        # Filter the main DataFrame for the requested districts
        # Use .copy() to avoid potential SettingWithCopyWarning later
        filtered_df = df[df['DISTRICT_STANDARDIZED'].isin(target_districts_std)].copy()

        # Handle case where none of the requested districts are found in the dataset
        if filtered_df.empty:
             missing_districts_str = ", ".join(target_districts_std)
             print(f"Districts not found in dataset: {missing_districts_str}")
             # Return a null score but indicate success (200 OK) as the request was processed
             # The frontend interprets null score as "Not Available"
             return jsonify({'safety_score': None, 'message': f'Data not available for district(s): {missing_districts_str}'})

        # --- !! Adapt Calculation Logic and Columns Here !! ---
        # Use the list defined during data loading (ensure it's accessible, e.g., global)
        # This EXAMPLE sums specified crime columns. Replace with your actual logic.
        # Make sure these columns were converted to numeric during loading.
        score_columns_to_sum = required_score_columns # Uses the list defined globally
        # -------------------------------------------------------

        # Calculate a 'total_crime_metric' for each *row* in the filtered data
        # Ensure required columns actually exist in the DataFrame before summing
        valid_score_cols = [col for col in score_columns_to_sum if col in filtered_df.columns]
        if not valid_score_cols:
             print(f"Error: None of the required score columns ({score_columns_to_sum}) found in the filtered data for districts {target_districts_std}.")
             return jsonify({'error': 'Internal error: Missing required data columns for calculation.'}), 500
        print(f"Calculating 'total_crime_metric' using columns: {valid_score_cols}")
        filtered_df['total_crime_metric'] = filtered_df[valid_score_cols].sum(axis=1)

        # Group by the standardized district name and sum the metric to get the total for each district
        district_totals = filtered_df.groupby('DISTRICT_STANDARDIZED')['total_crime_metric'].sum()

        # --- Normalization: Calculate relative to the *entire* dataset ---
        # Calculate the same metric across *all* districts in the full dataset
        all_valid_score_cols = [col for col in score_columns_to_sum if col in df.columns]
        if not all_valid_score_cols:
             # This check should ideally pass if the previous one passed, but good for safety
             print(f"Error: None of the required score columns ({score_columns_to_sum}) found in the full dataset for normalization.")
             return jsonify({'error': 'Internal error: Cannot normalize scores due to missing columns.'}), 500

        # Use a temporary column for calculation on the main DataFrame
        df['temp_total_crime_metric_all'] = df[all_valid_score_cols].sum(axis=1)
        all_district_totals = df.groupby('DISTRICT_STANDARDIZED')['temp_total_crime_metric_all'].sum()
        # Clean up the temporary column immediately after use
        df.drop(columns=['temp_total_crime_metric_all'], inplace=True)

        # Calculate the baseline using the median value across all districts (more robust to outliers than mean)
        baseline_crime_metric = all_district_totals.median()
        # Avoid division by zero if the median is somehow zero
        if baseline_crime_metric == 0:
            print("Warning: Baseline (median) crime metric is 0. Setting to 1 to avoid division by zero.")
            baseline_crime_metric = 1

        print(f"Baseline Crime Metric (Median of '{'+'.join(valid_score_cols)}') Across All {len(all_district_totals)} Districts: {baseline_crime_metric:.2f}")

        # Calculate final scores for the requested districts that were found
        final_scores_dict = {} # Store score and metric for each found district
        found_districts_list_std = [] # Keep track of which requested districts were found

        for district_std_name, total_metric in district_totals.items():
            # --- !! Adapt Safety Score Formula Here !! ---
            # Calculate crime relative to the baseline median
            relative_crime = total_metric / baseline_crime_metric

            # *** ADJUST THE MULTIPLIER HERE TO CONTROL SCORE SENSITIVITY ***
            # Lower value = scores decrease slower = generally higher scores
            # Try values like 25, 30, 33, 40 etc. instead of the original 50.
            score_multiplier = 25 # <--- ADJUST THIS VALUE AS NEEDED
            # -------------------------------------------------------------

            # Calculate score: 100 is best, 0 is worst. Score decreases as relative_crime increases.
            # Capped between 0 and 100.
            safety_score = max(0, min(100, 100 - (relative_crime * score_multiplier)))
            safety_score = round(safety_score, 2) # Round to 2 decimal places

            # --- Add this print statement for debugging each district ---
            print(f"DEBUG SCORE CALC - District: {district_std_name}, "
                  f"TotalMetric: {total_metric:.2f}, "
                  f"BaselineMedian: {baseline_crime_metric:.2f}, "
                  f"RelativeCrime: {relative_crime:.2f}, "
                  f"Multiplier: {score_multiplier}, "
                  f"CalculatedScore: {safety_score}")
            # -----------------------------------------------------------

            final_scores_dict[district_std_name] = {
                'total_crime_metric': round(total_metric, 2), # Store the metric used
                'safety_score': safety_score
            }
            found_districts_list_std.append(district_std_name) # Add found district to list

        # --- Format Response ---
        if len(target_districts_std) == 1 and len(final_scores_dict) == 1:
            # Case 1: Single district was requested AND found
            single_district_name_std = found_districts_list_std[0]
            result = {
                'district': single_district_name_std, # Return the standardized name
                'total_crimes': final_scores_dict[single_district_name_std]['total_crime_metric'], # Use 'total_crimes' key for frontend compatibility
                'safety_score': final_scores_dict[single_district_name_std]['safety_score']
            }
            print(f"Returning score for single district '{single_district_name_std}': {result}")
            return jsonify(result)

        elif len(final_scores_dict) > 0:
            # Case 2: Multiple districts requested, at least one found. Return aggregated score.
            # Calculate the average score of the districts FOUND.
            average_score_found = sum(s['safety_score'] for s in final_scores_dict.values()) / len(final_scores_dict)
            total_metric_found = sum(s['total_crime_metric'] for s in final_scores_dict.values())
            result = {
                'districts_found': found_districts_list_std, # List districts for which score was calculated
                'total_crimes_aggregate': round(total_metric_found, 2), # Sum of metrics for found districts
                'safety_score': round(average_score_found, 2) # The averaged score
                 # Optionally include details per district if needed by frontend later:
                 # 'details': final_scores_dict
            }
            print(f"Returning aggregated score for found districts {found_districts_list_std}: {result}")
            # Return 200 OK even if not all requested districts were found, as some were processed.
            # The frontend workaround expects a single 'safety_score' key.
            return jsonify(result)
        else:
            # Case 3: Should technically be covered by the initial 'filtered_df.empty' check,
            # but acts as a safeguard if something went wrong.
             print(f"Could not calculate score for any requested districts: {target_districts_std}")
             # Return null score to indicate unavailability
             return jsonify({'safety_score': None, 'message': f'Could not calculate score for requested districts: {", ".join(target_districts_std)}'})

    # --- General Error Handling ---
    except Exception as e:
        print(f"ERROR during safety score calculation for districts {target_districts_std}:")
        traceback.print_exc() # Print full traceback to Flask console for debugging
        return jsonify({'error': 'An unexpected server error occurred during score calculation.'}), 500
@app.route('/api/blog/posts', methods=['GET'])
def get_blog_posts():
    """Fetches all blog posts, ordered by most recent."""
    conn = None
    try:
        conn = get_db_connection()
        posts_cursor = conn.execute("""
            SELECT id, user_id, author_name, title, content,
                   strftime('%Y-%m-%d %H:%M', created_at) as created_at, likes
            FROM blog_posts
            ORDER BY created_at DESC
        """)
        posts = posts_cursor.fetchall()
        # Convert Row objects to dictionaries
        posts_list = [dict(post) for post in posts]
        return jsonify(posts_list)
    except Exception as e:
        print(f"Error fetching blog posts: {e}")
        traceback.print_exc()
        # Ensure connection is closed if opened
        if conn: conn.close()
        return jsonify({"error": "Failed to fetch blog posts"}), 500
    finally:
        # Ensure connection is closed even if no exception occurred
        if conn: conn.close()

@app.route('/api/blog/posts', methods=['POST'])
def create_blog_post():
    """Creates a new blog post."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing request body'}), 400

    # --- Placeholder Auth: Get userId from request body ---
    # !!! WARNING: Insecure for production. Use JWT/Sessions. !!!
    user_id_str = data.get('userId')
    title = data.get('title')
    content = data.get('content')
    anonymous = data.get('anonymous', True) # Default to anonymous if not provided
    # --- End Placeholder Auth ---

    # --- Basic Validation ---
    if not user_id_str: return jsonify({'error': 'Missing user identifier (userId)'}), 400
    if not title or not title.strip(): return jsonify({'error': 'Title required'}), 400
    if not content or not content.strip(): return jsonify({'error': 'Content required'}), 400

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid userId format'}), 400
    # --- End Validation ---

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Determine author name based on anonymous flag and user existence
        author_name = "Anonymous"
        if not anonymous:
            user = cursor.execute('SELECT full_name FROM users WHERE id = ?', (user_id,)).fetchone()
            if user:
                author_name = user['full_name']
            else:
                # User ID might be valid format but not exist, or just post as Anonymous
                print(f"Warning: User ID {user_id} not found for non-anonymous blog post. Posting as Anonymous.")
                # Keep author_name as "Anonymous" if user not found, even if anonymous=False was sent

        # Insert the new post
        cursor.execute(
            'INSERT INTO blog_posts (user_id, author_name, title, content) VALUES (?, ?, ?, ?)',
            (user_id, author_name, title.strip(), content.strip())
        )
        conn.commit()
        new_post_id = cursor.lastrowid # Get the ID of the newly inserted post
        return jsonify({'message': 'Story posted successfully', 'postId': new_post_id}), 201

    except sqlite3.IntegrityError as ie:
         # Handle potential foreign key constraint failure (user_id doesn't exist)
         if conn: conn.rollback()
         print(f"Error creating blog post (Integrity): {ie}")
         traceback.print_exc()
         if 'FOREIGN KEY constraint failed' in str(ie):
             return jsonify({'error': 'Cannot create post: Associated user does not exist.'}), 400 # Bad request
         else:
            return jsonify({'error': 'Database integrity error while posting story.'}), 500
    except Exception as e:
        if conn: conn.rollback() # Rollback on any other error
        print(f"Error creating blog post: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to post story due to server error.'}), 500
    finally:
        if conn: conn.close()


@app.route('/api/blog/posts/<int:post_id>/like', methods=['POST'])
def like_blog_post(post_id):
    """Increments the like count for a specific post."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Use UPDATE...RETURNING or separate SELECT for atomicity if needed, but this is simpler for now
        cursor.execute('UPDATE blog_posts SET likes = likes + 1 WHERE id = ?', (post_id,))

        # Check if any row was actually updated (i.e., if the post exists)
        if cursor.rowcount == 0:
            # No rows updated means post with that ID wasn't found
            conn.rollback() # Rollback before aborting
            abort(404, description=f"Blog post with ID {post_id} not found.")

        # Fetch the new like count to return it
        likes_cursor = cursor.execute('SELECT likes FROM blog_posts WHERE id = ?', (post_id,))
        result = likes_cursor.fetchone()

        conn.commit() # Commit the transaction

        if result:
            new_likes = result['likes']
            return jsonify({'message': 'Post liked', 'newLikes': new_likes}), 200
        else:
            # This case should technically not happen if rowcount > 0, but handle defensively
            abort(500, description="Failed to retrieve updated like count after update.")

    except HTTPException as e:
        # Catch abort() calls and re-raise them
        if conn: conn.rollback() # Ensure rollback if abort happened before commit
        raise e
    except Exception as e:
        if conn: conn.rollback() # Rollback on generic errors
        print(f"Error liking post {post_id}: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to like post'}), 500
    finally:
        if conn: conn.close()


@app.route('/api/blog/posts/<int:post_id>', methods=['PUT'])
def update_blog_post(post_id):
    """Updates an existing blog post."""
    data = request.get_json()
    if not data: return jsonify({'error': 'Missing request body'}), 400

    # --- Placeholder Auth: Get userId from request body ---
    # !!! WARNING: Insecure for production. Use JWT/Sessions. !!!
    logged_in_user_id_str = data.get('userId')
    title = data.get('title')
    content = data.get('content')
    # --- End Placeholder Auth ---

    # --- Basic Validation ---
    if not logged_in_user_id_str: return jsonify({'error': 'Auth required (userId missing)'}), 401
    if not title or not title.strip(): return jsonify({'error': 'Title required'}), 400
    if not content or not content.strip(): return jsonify({'error': 'Content required'}), 400

    try:
        logged_in_user_id = int(logged_in_user_id_str)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid userId format'}), 400
    # --- End Validation ---

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # --- Authorization Check: Verify post exists and user owns it ---
        post_owner_cursor = cursor.execute('SELECT user_id FROM blog_posts WHERE id = ?', (post_id,))
        post_owner = post_owner_cursor.fetchone()

        if post_owner is None:
            abort(404, description=f"Blog post with ID {post_id} not found.")
        if post_owner['user_id'] != logged_in_user_id:
            abort(403, description="Not authorized to edit this post.") # Forbidden
        # --- End Authorization Check ---

        # Update the post content
        cursor.execute(
            'UPDATE blog_posts SET title = ?, content = ? WHERE id = ? AND user_id = ?',
            (title.strip(), content.strip(), post_id, logged_in_user_id)
        )
        conn.commit()

        # Check if update happened (mostly as a sanity check post-commit)
        if cursor.rowcount == 0:
             # This might occur if the post was deleted between the auth check and update
             abort(404, description="Blog post not found or update failed unexpectedly.")

        # Fetch and return the full updated post data
        updated_post_cursor = conn.execute(
            """
            SELECT id, user_id, author_name, title, content,
                   strftime('%Y-%m-%d %H:%M', created_at) as created_at, likes
            FROM blog_posts WHERE id = ?
            """,
            (post_id,)
        )
        updated_post = updated_post_cursor.fetchone()

        if updated_post:
            return jsonify({
                'message': 'Post updated successfully',
                'post': dict(updated_post) # Return the updated post object
            }), 200
        else:
            # Should not happen if commit succeeded and rowcount > 0
            abort(500, description="Failed to retrieve updated post after successful update.")

    except HTTPException as e:
        if conn: conn.rollback() # Rollback on abort
        raise e
    except Exception as e:
        if conn: conn.rollback() # Rollback on other errors
        print(f"Error updating post {post_id}: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to update post due to server error'}), 500
    finally:
        if conn: conn.close()


@app.route('/api/blog/posts/<int:post_id>', methods=['DELETE'])
def delete_blog_post(post_id):
    """Deletes an existing blog post."""
    # --- Placeholder Auth: Get userId from request body (Axios sends DELETE body in 'data') ---
    # !!! WARNING: Insecure for production. Use JWT/Sessions. !!!
    data = request.get_json()
    if not data: return jsonify({'error': 'Missing request body (needs userId)'}), 400

    logged_in_user_id_str = data.get('userId')
    if not logged_in_user_id_str: return jsonify({'error': 'Auth required (userId missing)'}), 401
    try:
        logged_in_user_id = int(logged_in_user_id_str)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid userId format'}), 400
    # --- End Placeholder Auth ---

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # --- Authorization Check: Verify post exists and user owns it ---
        post_owner_cursor = cursor.execute('SELECT user_id FROM blog_posts WHERE id = ?', (post_id,))
        post_owner = post_owner_cursor.fetchone()

        if post_owner is None:
            abort(404, description=f"Blog post with ID {post_id} not found.")
        if post_owner['user_id'] != logged_in_user_id:
            abort(403, description="Not authorized to delete this post.") # Forbidden
        # --- End Authorization Check ---

        # Delete the post
        cursor.execute('DELETE FROM blog_posts WHERE id = ? AND user_id = ?', (post_id, logged_in_user_id))
        conn.commit()

        # Check if delete happened
        if cursor.rowcount == 0:
            # This might occur if the post was deleted between the auth check and the delete command
            abort(404, description="Post not found or already deleted.")

        return jsonify({'message': 'Post deleted successfully'}), 200 # OK for delete

    except HTTPException as e:
        if conn: conn.rollback() # Rollback on abort
        raise e
    except Exception as e:
        if conn: conn.rollback() # Rollback on other errors
        print(f"Error deleting post {post_id}: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to delete post due to server error'}), 500
    finally:
        if conn: conn.close()

# GET User Profile
@app.route('/api/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    # Authentication/Authorization check can be added here
    conn = None
    try:
        conn = get_db_connection()
        # Fetch user details (excluding password)
        user_cursor = conn.execute(
            'SELECT id, full_name, email, phone_number FROM users WHERE id = ?',
            (user_id,)
        )
        user = user_cursor.fetchone()

        if user is None:
            abort(404, description="User not found")

        # Fetch associated emergency contacts
        contacts_cursor = conn.execute(
            'SELECT id, name, number FROM emergency_contacts WHERE user_id = ? ORDER BY id',
            (user_id,)
        )
        contacts = contacts_cursor.fetchall()

        # Convert to dictionary format for JSON response
        user_dict = dict(user)
        user_dict['emergency_contacts'] = [dict(contact) for contact in contacts]

        return jsonify(user_dict)  # Return combined user and contact info

    except Exception as e:
        print(f"Error fetching profile for user {user_id}: {e}")
        import traceback
        traceback.print_exc()  # Print full traceback for debugging
        abort(500, description="Failed to fetch profile data")
    finally:
        if conn:
            conn.close()

# UPDATE User Profile (Corrected for multiple contacts)
# UPDATE User Profile (Corrected for multiple contacts)
@app.route('/api/profile/<int:user_id>', methods=['PUT'])
def update_profile(user_id):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Missing request body'}), 400

    full_name = data.get('fullName')
    phone_number = data.get('phoneNumber')  # Allow empty string or null
    emergency_contacts = data.get('emergencyContacts')  # Expect a list

    # --- Basic Validation ---
    if full_name is None:
        return jsonify({'error': 'Missing required profile field: Full Name'}), 400

    if emergency_contacts is not None:
        if not isinstance(emergency_contacts, list):
            return jsonify({'error': 'Emergency contacts must be provided as a list'}), 400
        for contact in emergency_contacts:
            if not isinstance(contact, dict) or not contact.get('name') or not contact.get('number'):
                return jsonify({'error': 'Each emergency contact must have a non-empty name and number'}), 400

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Update user info
        cursor.execute('''
            UPDATE users
            SET full_name = ?, phone_number = ?
            WHERE id = ?
        ''', (full_name, phone_number, user_id))

        # If emergency contacts are provided, update them
        if emergency_contacts is not None:
            # First delete existing contacts
            cursor.execute('DELETE FROM emergency_contacts WHERE user_id = ?', (user_id,))

            # Insert new contacts
            contact_tuples = [(user_id, contact['name'], contact['number']) for contact in emergency_contacts]
            cursor.executemany('''
                INSERT INTO emergency_contacts (user_id, name, number)
                VALUES (?, ?, ?)
            ''', contact_tuples)

        conn.commit()
        return jsonify({'message': 'Profile updated successfully'}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error updating profile for user {user_id}: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to update profile'}), 500

    finally:
        if conn:
            conn.close()
CD_STATE_COL = 'STATE/UT'
CD_DISTRICT_COL = 'DISTRICT'
CD_YEAR_COL = 'YEAR'
@app.route('/api/locations/states', methods=['GET'])
def get_states():
    """Returns a sorted list of unique state names."""
    if df is None or df.empty:
        print("Error fetching states: DataFrame not loaded.")
        return jsonify({"message": "Server error: Data source not available."}), 503

    if CD_STATE_COL not in df.columns:
        print(f"Error fetching states: Column '{CD_STATE_COL}' not found in DataFrame.")
        return jsonify({"message": f"Server configuration error: Missing '{CD_STATE_COL}' column."}), 500

    try:
        states = sorted(df[CD_STATE_COL].dropna().unique().tolist())
        states_formatted = [{"name": state} for state in states if state]
        print(f"Returning {len(states_formatted)} unique states.")
        return jsonify({"states": states_formatted})
    except Exception as e:
        print(f"Error processing states list: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Error generating states list: {str(e)}'}), 500


@app.route('/api/locations/districts', methods=['GET'])
def get_districts_for_state():
    """Returns a sorted list of unique district names for a given state."""
    state_name = request.args.get('state')

    if not state_name:
        return jsonify({"error": "Missing required query parameter: state"}), 400

    if df is None or df.empty:
        print("Error fetching districts: DataFrame not loaded.")
        return jsonify({"message": "Server error: Data source not available."}), 503

    required_cols = [CD_STATE_COL, CD_DISTRICT_COL]
    missing_csv_cols = [col for col in required_cols if col not in df.columns]
    if missing_csv_cols:
         print(f"Error fetching districts: Missing required columns in DataFrame: {missing_csv_cols}")
         return jsonify({"message": f"Server configuration error: Missing required columns ({', '.join(missing_csv_cols)})"}), 500

    try:
        state_filtered_df = df[df[CD_STATE_COL].str.strip().str.upper() == state_name.strip().upper()]

        if state_filtered_df.empty:
             print(f"No districts found for state: {state_name}")
             return jsonify({"districts": []})

        districts = sorted(state_filtered_df[CD_DISTRICT_COL].dropna().unique().tolist())
        districts_formatted = [{"name": district} for district in districts if district]
        print(f"Returning {len(districts_formatted)} districts for state: {state_name}")
        return jsonify({"districts": districts_formatted})
    except Exception as e:
        print(f"Error processing districts list for state {state_name}: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Error generating districts list: {str(e)}'}), 500


@app.route('/api/locations/years-for-location', methods=['GET'])
def get_years_for_location():
    """
    Returns a sorted list of unique years available for a specific state and district.
    """
    state_name = request.args.get('state')
    district_name = request.args.get('district')

    if not state_name or not district_name:
        return jsonify({"error": "Missing required query parameters: state and district"}), 400

    if df is None or df.empty:
        print("Error fetching years for location: DataFrame not loaded.")
        return jsonify({"message": "Server error: Data source not available."}), 503

    required_cols = [CD_STATE_COL, CD_DISTRICT_COL, CD_YEAR_COL]
    missing_csv_cols = [col for col in required_cols if col not in df.columns]
    if missing_csv_cols:
         print(f"Error fetching years for location: Missing required columns: {missing_csv_cols}")
         return jsonify({"message": f"Server configuration error: Missing required columns ({', '.join(missing_csv_cols)})"}), 500

    try:
        filtered_df = df[
            (df[CD_STATE_COL].str.strip().str.upper() == state_name.strip().upper()) &
            (df[CD_DISTRICT_COL].str.strip().str.upper() == district_name.strip().upper())
        ]

        if filtered_df.empty:
            print(f"No data found for {district_name}, {state_name} to determine available years.")
            return jsonify({"years": []})

        years_series = pd.to_numeric(filtered_df[CD_YEAR_COL], errors='coerce').dropna().unique()
        available_years = sorted([int(year) for year in years_series], reverse=True)

        print(f"Returning {len(available_years)} available years for {district_name}, {state_name}.")
        return jsonify({"years": available_years})
    except Exception as e:
        print(f"Error processing years list for {district_name}, {state_name}: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Error generating years list: {str(e)}'}), 500


@app.route('/api/crime-data', methods=['GET'])
def get_specific_crime_data():
    """
    Fetches detailed crime statistics for a specific state, district, and year,
    including pre-calculated crime_rate and safety level from the CSV.
    """
    # Assumes 'df' is your globally loaded Pandas DataFrame
    if df is None or df.empty:
        print("Error fetching crime data: DataFrame not loaded.")
        return jsonify({"message": "Server error: Crime data source not available."}), 503

    try:
        # --- 1. GET PARAMETERS FIRST ---
        state = request.args.get('state')
        district = request.args.get('district')
        year = request.args.get('year')

        # --- 2. VALIDATE PARAMETERS ---
        if not state or not district or not year:
            return jsonify({"message": "Missing required query parameters: state, district, year"}), 400

        # --- 3. START DEBUG LOGGING ---
        # (Kept for diagnosing potential 404s, remove if not needed)
        print(f"\n--- Debugging /api/crime-data ---")
        print(f"Received Params: state='{state}', district='{district}', year='{year}'")
        print(f"Using columns: State='{CD_STATE_COL}', District='{CD_DISTRICT_COL}', Year='{CD_YEAR_COL}'")

        # --- 4. ENSURE REQUIRED FILTERING COLUMNS EXIST ---
        # Assumes CD_STATE_COL, CD_DISTRICT_COL, CD_YEAR_COL are defined globally
        required_filter_cols = [CD_STATE_COL, CD_DISTRICT_COL, CD_YEAR_COL]
        missing_filter_cols = [col for col in required_filter_cols if col not in df.columns]
        if missing_filter_cols:
             print(f"Error: Missing columns needed for filtering: {missing_filter_cols}")
             return jsonify({"message": f"Server configuration error: Data source missing key columns."}), 500

        # --- 5. REFINE FILTERING LOGIC ---
        try:
            target_year_int = int(year.strip())
        except ValueError:
            print(f"Error: Invalid year parameter received: '{year}'")
            return jsonify({"error": f"Invalid year format provided: {year}"}), 400

        # Prepare individual conditions
        condition_state = (df[CD_STATE_COL].str.strip().str.upper() == state.strip().upper())
        condition_district = (df[CD_DISTRICT_COL].str.strip().str.upper() == district.strip().upper())
        df_year_numeric = pd.to_numeric(df[CD_YEAR_COL], errors='coerce')
        # Corrected version: Compares numeric column directly with integer, avoids .astype(int) on the full series
        condition_year = (df_year_numeric.notna() & (df_year_numeric == target_year_int))

        # Log intermediate counts (for debugging)
        print(f"Rows matching State ({state}): {condition_state.sum()}")
        print(f"Rows matching District ({district}): {condition_district.sum()}")
        print(f"Rows matching Year ({target_year_int}): {condition_year.sum()}")

        # Apply combined filter
        filtered_df = df[condition_state & condition_district & condition_year]

        # Log shape after combined filter
        print(f"Shape of final filtered_df: {filtered_df.shape}")

        # --- 6. CHECK FILTER RESULT & RESPOND ---
        if filtered_df.empty:
            # Log details about the state/district subset (for debugging)
            state_district_subset = df[condition_state & condition_district]
            print(f"Shape of subset matching State AND District only: {state_district_subset.shape}")
            if not state_district_subset.empty:
                available_years_in_subset = sorted(pd.to_numeric(state_district_subset[CD_YEAR_COL], errors='coerce').dropna().unique().astype(int).tolist())
                print(f"Years available in State/District subset: {available_years_in_subset}")
            else:
                print("No rows found matching State AND District.")
            print(f"Filter result empty. Returning 404.")
            return jsonify({"message": f"No crime data found for {district}, {state} in {year}"}), 404
        else:
            # Data found, process the first matching row
            print(f"Data found ({filtered_df.shape[0]} rows). Processing first row...")
            found_data = filtered_df.iloc[0]

            # --- Map CSV Columns to JSON Response ---
            # **VERY IMPORTANT**: Verify ALL remaining .get('COLUMN_NAME') strings
            # match your actual CSV headers EXACTLY! Check the actual file
            # or the output of print(df.columns.tolist())
            response_data = {
                 "state": found_data.get(CD_STATE_COL),
                 "district": found_data.get(CD_DISTRICT_COL),
                 "year": int(found_data.get(CD_YEAR_COL)) if pd.notna(found_data.get(CD_YEAR_COL)) else None,

                 # --- Crime Counts ---
                 "total_ipc_crimes": int(found_data.get('TOTAL IPC CRIMES')) if pd.notna(found_data.get('TOTAL IPC CRIMES')) else None, # Verify name
                 "murder": int(found_data.get('MURDER')) if pd.notna(found_data.get('MURDER')) else None, # Verify name
                 "attempt_to_murder": int(found_data.get('ATTEMPT TO MURDER')) if pd.notna(found_data.get('ATTEMPT TO MURDER')) else None, # Verify name
                 "culpable_homicide": int(found_data.get('CULPABLE HOMICIDE NOT AMOUNTING TO MURDER')) if pd.notna(found_data.get('CULPABLE HOMICIDE NOT AMOUNTING TO MURDER')) else None, # Verify name
                 "rape": int(found_data.get('RAPE')) if pd.notna(found_data.get('RAPE')) else None, # Verify name
                 "kidnapping_abduction": int(found_data.get('KIDNAPPING & ABDUCTION')) if pd.notna(found_data.get('KIDNAPPING & ABDUCTION')) else None, # Verify name
                 "riots": int(found_data.get('RIOTS')) if pd.notna(found_data.get('RIOTS')) else None, # Verify name
                 "dacoity": int(found_data.get('DACOITY')) if pd.notna(found_data.get('DACOITY')) else None, # Verify name
                 "robbery": int(found_data.get('ROBBERY')) if pd.notna(found_data.get('ROBBERY')) else None, # Verify name
                 "burglary": int(found_data.get('BURGLARY')) if pd.notna(found_data.get('BURGLARY')) else None, # Verify name
                 "theft": int(found_data.get('THEFT')) if pd.notna(found_data.get('THEFT')) else None, # Verify name
                 "auto_theft": int(found_data.get('AUTO THEFT')) if pd.notna(found_data.get('AUTO THEFT')) else None, # Verify name
                 "other_theft": int(found_data.get('OTHER THEFT')) if pd.notna(found_data.get('OTHER THEFT')) else None, # Verify name
                 "dowry_deaths": int(found_data.get('DOWRY DEATHS')) if pd.notna(found_data.get('DOWRY DEATHS')) else None, # Verify name
                 "assault_on_women": int(found_data.get('ASSAULT ON WOMEN WITH INTENT TO OUTRAGE HER MODESTY')) if pd.notna(found_data.get('ASSAULT ON WOMEN WITH INTENT TO OUTRAGE HER MODESTY')) else None, # Verify name
                 # REMOVED "sexual_harassment": int(found_data.get('SEXUAL HARASSMENT')) if pd.notna(found_data.get('SEXUAL HARASSMENT')) else None,
                 # REMOVED "stalking": int(found_data.get('STALKING')) if pd.notna(found_data.get('STALKING')) else None,
                 "cruelty_by_husband": int(found_data.get('CRUELTY BY HUSBAND OR HIS RELATIVES')) if pd.notna(found_data.get('CRUELTY BY HUSBAND OR HIS RELATIVES')) else None, # Verify name
                 "cheating": int(found_data.get('CHEATING')) if pd.notna(found_data.get('CHEATING')) else None, # Verify name
                 "hurt_grievous_hurt": int(found_data.get('HURT/GREVIOUS HURT')) if pd.notna(found_data.get('HURT/GREVIOUS HURT')) else None, # Verify name

                 # --- Rate/Safety/Distance ---
                 "crime_rate": float(found_data.get('crime_rate')) if pd.notna(found_data.get('crime_rate')) else None, # Verify 'crime_rate' exists
                 "safety": str(found_data.get('safety')) if pd.notna(found_data.get('safety')) else None, # Verify 'safety' exists
                 # REMOVED "distance_metric": float(found_data.get('distance_t')) if pd.notna(found_data.get('distance_t')) else None,

                 # --- Lat/Lon ---
                 "latitude": float(found_data.get('latitude')) if pd.notna(found_data.get('latitude')) else None, # Verify 'latitude' exists
                 "longitude": float(found_data.get('longitude')) if pd.notna(found_data.get('longitude')) else None, # Verify 'longitude' exists
            }
            return jsonify(response_data), 200

    # --- General Error Handling ---
    except Exception as e:
        print(f"Error processing /api/crime-data request:")
        traceback.print_exc()
        return jsonify({'error': 'An unexpected server error occurred while fetching crime data.'}), 500
# --- End of new route ---
@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        route_name = data.get('routeName')
        rating = data.get('rating')
        comments = data.get('comments', '')

        # --- !!! CRITICAL SECURITY WARNING !!! ---
        # You NEED a secure way to get the logged-in user's ID.
        # Passing 'userId' in the request body is INSECURE as shown
        # in your other routes. Implement JWT or Sessions first.
        # For DEMONSTRATION ONLY, assuming 'userId' is sent (replace with real auth):
        logged_in_user_id = data.get('userId')
        if logged_in_user_id is None:
             # In a real app with auth, you'd get this from the token/session
             return jsonify({'error': 'Authentication required'}), 401
        # --- END SECURITY WARNING ---

        if not route_name or rating is None:
            return jsonify({'error': 'routeName and rating are required fields'}), 400
        # Add check for valid userId if needed (e.g., is it an integer?)
        try:
            user_id_int = int(logged_in_user_id)
        except (ValueError, TypeError):
             return jsonify({'error': 'Invalid user identifier'}), 400


        conn = get_db_connection()
        cursor = conn.cursor()

        # --- Check if user exists (optional but good practice) ---
        user_exists = cursor.execute('SELECT 1 FROM users WHERE id = ?', (user_id_int,)).fetchone()
        if not user_exists:
             conn.close()
             return jsonify({'error': 'User not found'}), 404
        # --- End user check ---


        # --- MODIFIED INSERT statement ---
        cursor.execute('''
            INSERT INTO feedback (user_id, route_name, rating, comments)
            VALUES (?, ?, ?, ?)
        ''', (user_id_int, route_name, rating, comments)) # Pass user_id here
        # --- END MODIFICATION ---

        conn.commit()
        conn.close()

        return jsonify({'message': 'Feedback submitted successfully'}), 201

    except Exception as e:
        # Safely close connection if it exists
        if 'conn' in locals() and conn:
             try:
                 conn.close()
             except Exception as close_e:
                 print(f"Error closing connection after exception: {close_e}")
        print("Error submitting feedback:", e)
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/feedback', methods=['GET'])
def get_feedback():
    conn = None
    try:
        conn = get_db_connection()
        # --- MODIFIED SELECT statement with JOIN ---
        feedback_cursor = conn.execute(
            """
            SELECT f.id, f.route_name, f.rating, f.comments,
                   strftime('%Y-%m-%d %H:%M', f.created_at) as created_at,
                   u.full_name as user_name -- Get user's full name and alias it
            FROM feedback f -- Alias feedback table as 'f'
            JOIN users u ON f.user_id = u.id -- JOIN with users table (aliased 'u') on user_id
            ORDER BY f.created_at DESC
            LIMIT 10
            """,
        )
        # --- END MODIFICATION ---
        feedback_list = [dict(row) for row in feedback_cursor.fetchall()]
        conn.close()
        return jsonify(feedback_list)

    except Exception as e:
        if conn:
             try:
                 conn.close()
             except Exception as close_e:
                 print(f"Error closing connection after exception: {close_e}")
        print("Error fetching feedback:", e)
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch feedback"}), 500
# --- Error Handlers ---
@app.route('/api/emergency/trigger', methods=['POST'])
def trigger_emergency_alert():
    # !!! Add Authentication here !!!

    data = request.get_json()
    user_id = data.get('userId')
    location = data.get('location')

    if not user_id or not location or 'latitude' not in location or 'longitude' not in location:
        return jsonify({'error': 'Missing userId or location data'}), 400

    conn = None
    try:
        conn = get_db_connection()
        user = conn.execute('SELECT full_name FROM users WHERE id = ?', (user_id,)).fetchone()
        user_name = user['full_name'] if user else f"User {user_id}"

        contacts = conn.execute('SELECT name, number FROM emergency_contacts WHERE user_id = ?', (user_id,)).fetchall()

        if not contacts:
            return jsonify({'error': 'No emergency contacts found for this user'}), 404

        lat = location['latitude']
        lon = location['longitude']
        location_url = f"https://www.google.com/maps?q=${lat},{lon}"
        message_body = f"Emergency Alert: {user_name} is in danger. Please help. Location: {location_url}"

        print(f"Constructed alert: {message_body}")

        success_count = 0
        failure_count = 0
        errors_list = []

        for contact in contacts:
            contact_name = contact['name']
            contact_number_raw = contact['number']
            print(f"Processing contact: {contact_name} ({contact_number_raw})")

            # --- Format Phone Number ---
            contact_number = contact_number_raw.replace(" ", "").replace("-", "") # Basic cleaning
            if not contact_number.startswith('+'):
                 # Simple logic for potential Indian numbers - REVIEW THIS CAREFULLY
                 if len(contact_number) == 10:
                     contact_number = f"+91{contact_number}"
                     print(f"Formatted number to +91: {contact_number}")
                 elif len(contact_number) == 12 and contact_number.startswith('91'): # Handles cases where 91 is prefixed without +
                     contact_number = f"+{contact_number}"
                     print(f"Formatted number adding +: {contact_number}")
                 else:
                      # Keep original with '+' if it just missed that, otherwise it might be invalid
                      contact_number = f"+{contact_number_raw.replace(' ', '').replace('-', '')}" # Fallback adding + to original cleaned
                      print(f"Warning: Assuming E.164 format by adding '+': {contact_number}. Verify number.")


            sent_via_sms = False
            # --- Send SMS using Twilio ---
            if twilio_client and TWILIO_NUMBER: # Check if client initialized
                try:
                    # *** Lines below are now UNCOMMENTED ***
                    message = twilio_client.messages.create(
                        body=message_body,
                        from_=TWILIO_NUMBER, # Your Twilio number from .env
                        to=contact_number    # Recipient number (E.164 format)
                    )
                    # *** End Uncommented block ***
                    print(f"SMS successfully sent to {contact_number}, SID: {message.sid}, Status: {message.status}")
                    sent_via_sms = True # Set flag on success

                except TwilioRestException as e:
                    # Handle Twilio specific errors (e.g., invalid number, permission)
                    print(f"Twilio Error sending SMS to {contact_number}: {e}")
                    errors_list.append(f"Failed SMS to {contact_name} ({contact_number}): {e.msg}")
                except Exception as e:
                    # Handle other potential errors during sending
                    print(f"Generic Error sending SMS to {contact_number}: {e}")
                    traceback.print_exc() # Print full traceback for generic errors
                    errors_list.append(f"Failed SMS to {contact_name} ({contact_number}): Unknown error")
            else:
                print(f"Skipping SMS to {contact_name}: Twilio client not configured or missing number.")
                errors_list.append(f"Skipped SMS to {contact_name}: Twilio not configured")

            # --- (Keep WhatsApp/Email commented out for now) ---

            # Update counts based on SMS success
            if sent_via_sms:
                success_count += 1
            else:
                failure_count += 1 # Count as failure if SMS wasn't attempted or failed


        # --- Response Logic ---
        if not contacts: # Double check if contacts list was initially empty
             return jsonify({'error': 'No emergency contacts found to send alerts to.'}), 404

        if failure_count > 0 and success_count == 0:
             # All failed or skipped
              return jsonify({
                  'error': 'Failed to send any emergency alerts.',
                  'message': f'Alert process completed. {success_count} sent, {failure_count} failed.',
                  'errors': errors_list
                  }), 500 # Internal server error if all failed
        elif failure_count > 0:
             # Partial success
              return jsonify({
                  'message': f'Alert process completed with partial success. {success_count} sent, {failure_count} failed.',
                  'errors': errors_list
                  }), 207 # Multi-Status response code
        else:
             # All succeeded
              return jsonify({'message': 'Emergency alerts sent successfully'}), 200

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in trigger_emergency_alert for user {user_id}: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Failed to process emergency alert'}), 500
    finally:
        if conn:
            conn.close()

# --- Error Handlers ---
@app.errorhandler(404)
def not_found(error):
    # Check if the error has a description from abort()
    description = getattr(error, 'description', 'The requested URL was not found on the server.')
    return jsonify({'error': 'Not Found', 'message': description}), 404

# 500 Error Handler
@app.errorhandler(500)
def internal_error(error):
    # Check if the error has a description from abort()
    description = getattr(error, 'description', 'An internal server error occurred.')
    return jsonify({'error': 'Internal Server Error', 'message': description}), 500
def mock_nlp_threat_score(text):
    # Simulated logic
    keywords = ['attack', 'harass', 'follow', 'threat']
    score = sum(word in text.lower() for word in keywords) / len(keywords)
    return round(score * 10, 2)  # Scale: 0–10

def mock_image_threat_score(img):
    # Simulated logic
    return 5.0  # Placeholder threat score for image (0–10)

def fuse_scores(nlp_score, image_score):
    total_score = 0.6 * nlp_score + 0.4 * image_score  # Both already out of 10
    print(f"[DEBUG] Fused Score: {total_score}")  # Optional debug log

    if total_score < 4:
        return "Low"
    elif total_score < 7:
        return "Medium"
    else:
        return "High"



@app.route('/api/predict_risk', methods=['POST'])
def predict_risk():
    try:
        description = request.form.get('description', '')
        image_file = request.files.get('image', None)

        nlp_score = mock_nlp_threat_score(description)
        image_score = 0

        if image_file:
            img = Image.open(BytesIO(image_file.read()))
            image_score = mock_image_threat_score(img)

        risk_level = fuse_scores(nlp_score, image_score)
        return jsonify({
            'nlp_score': nlp_score,
            'image_score': image_score,
            'risk_level': risk_level
        })

    except Exception as e:
        print("Prediction error:", e)
        traceback.print_exc()
        return jsonify({'error': 'Failed to process risk prediction'}), 500
@app.route('/api/report_incident', methods=['POST'])
def report_incident():
    try:
        # 1. Get text fields
        location = request.form.get('location', '')
        incident_type = request.form.get('incidentType', '')
        description = request.form.get('description', '')
        text_input = f"{location} {incident_type} {description}"

        # 2. Predict NLP-based threat
        nlp_score = predict_text_threat(text_input)

        # 3. Get and save image
        image = request.files.get('image')
        image_path = None
        image_score = 0
        if image:
            filename = secure_filename(image.filename)
            image_path = os.path.join(UPLOAD_FOLDER, filename)
            image.save(image_path)
            image_score = predict_image_threat(image_path)

        # 4. Get and save audio
        audio = request.files.get('audio')
        audio_path = None
        audio_score = 0
        if audio:
            filename = secure_filename(audio.filename)
            audio_path = os.path.join(UPLOAD_FOLDER, filename)
            audio.save(audio_path)
            audio_score = predict_audio_threat(audio_path)

        # 5. Combine scores using the real model
        location_score = 0.5  # Replace with real safety score if needed
        risk_level, final_score, nlp_score, image_score, audio_score = predict_risk_level(
            location_score, incident_type, description, image_path, audio_path
        )

        # 6. Send alert to police if risk is High
        if risk_level == "High":
            message = f"High-risk alert: {description}. Location: {location}. Incident type: {incident_type}."
            send_alert_to_police(message, POLICE_NUMBER)  # Pass the global police number here

        return jsonify({
            "risk_level": risk_level,
            "nlp_score": nlp_score,
            "image_score": image_score,
            "audio_score": audio_score
        })

    except Exception as e:
        print("Error:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
def send_alert_to_police(message, police_number):
    try:
        # Twilio credentials: Use the correct environment variable names
        TWILIO_SID = os.environ.get("TWILIO_ACCOUNT_SID")
        TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
        TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")

        # Ensure credentials are available
        if not (TWILIO_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
            raise ValueError("Twilio credentials are not properly configured.")

        # Initialize Twilio client
        client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)

        # Send message to police
        client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=police_number,
        )
        print(f"[INFO] Alert sent to police: {police_number}")
    except Exception as e:
        print(f"[ERROR] Failed to send alert: {e}")
        traceback.print_exc()
# --- Main Execution ---
if __name__ == '__main__':
    POLICE_NUMBER = os.getenv("POLICE_NUMBER", "+918838766216")
    # debug=True is NOT for production
    # Use a production-ready WSGI server like Gunicorn or Waitress for deployment
    app.run(debug=True, port=5000)