import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel,Field
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware
import csv
from datetime import datetime
model = joblib.load('Mental_Health_Model.pkl')
top_countries = ['Other','India','USA','Canada','Australia','UK','Germany','Mexico','Turkey','France'] 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#First pydantic model
class StudentData(BaseModel):
    name                    : str = Field(..., min_length=1)
    age                     : int = Field(..., ge =10 , le=100)
    gender                  : Literal['Male','Female']
    country                 : str
    academic_level          : Literal['Undergraduate', 'Graduate', 'High School']
    most_used_platform      : Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter',
       'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp',
       'WeChat']
    purpose_of_use          : Literal['Networking', 'Education', 'Entertainment', 'News'] 
    avg_daily_usage_hours   : float = Field(..., ge=0 , le=24)
    daily_unlocks           : int   = Field(...,ge=0)
    study_hours             : float = Field(...,ge=0 , le=24)
    physical_activity_hours : float = Field(...,ge=0 , le=24)
    sleep_hours_per_night   : float = Field(...,ge=0 , le=24)
    stress_level            : Literal['Medium', 'Low', 'Very High', 'High']



#Describe what we send back
class PredictionResponse(BaseModel):
    name: str
    predicted_mental_health_score:float

@app.get('/')
def greet():
    return {'message': 'Welcome to PsychePulse'}


@app.post('/predict' , response_model=PredictionResponse)
def predict(data: StudentData):

    country_group = data.country if data.country in top_countries else "Other"

    input_row = pd.DataFrame([{
        'Age'                    : data.age,
        'Gender'                 : data.gender,
        'Country'                : data.country,
        'Academic_Level'         : data.academic_level, 
        'Most_Used_Platform'     : data.most_used_platform ,
       'Purpose_Of_Use'          : data.purpose_of_use,
       'Avg_Daily_Usage_Hours'   : data.avg_daily_usage_hours, 
       'Daily_Unlocks'           : data.daily_unlocks,
       'Study_Hours'             : data.study_hours, 
       'Physical_Activity_Hours' : data.physical_activity_hours, 
       'Sleep_Hours_Per_Night'   : data.sleep_hours_per_night,
       'Stress_Level'            : data.stress_level, 
       'Grouped_country'         : country_group,         
    }])


    prediction = model.predict(input_row)[0]
    final_score = round(float(prediction), 2)
    
    # 1. Print to console (so you can see it live in your Render dashboard logs)
    print(f"✅ New Prediction -> Name: {data.name} | Score: {final_score}", flush=True)
    
    # 2. Save to a CSV file
    try:
        with open("user_scores.csv", mode="a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            # Writing: Date, Time, Name, Score
            writer.writerow([datetime.now().strftime("%Y-%m-%d %H:%M:%S"), data.name, final_score])
    except Exception as e:
        print(f"Error saving to CSV: {e}")

    return PredictionResponse(
        name=data.name,
        predicted_mental_health_score=final_score
    )