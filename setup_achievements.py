import asyncio
import os
from user_service import UserService

async def main():
    service = UserService()
    conn = await service.get_db_connection()
    
    with open('supabase_achievements.sql', 'r') as f:
        sql = f.read()
        
    print("Applying achievements SQL...")
    await conn.execute(sql)
    print("Tables created.")
    
    # Seed initial achievements
    achievements = [
        ('iron-scholar', 'Iron Scholar', 'Complete your first module', 'standard', 'iron', 'bi-trophy-fill'),
        ('bronze-learner', 'Bronze Learner', 'Complete 5 modules', 'standard', 'bronze', 'bi-trophy-fill'),
        ('silver-student', 'Silver Student', 'Complete 10 modules', 'standard', 'silver', 'bi-trophy-fill'),
        ('gold-graduate', 'Gold Graduate', 'Complete a full course', 'standard', 'gold', 'bi-trophy-fill'),
        ('platinum-pro', 'Platinum Pro', 'Complete 5 full courses', 'standard', 'platinum', 'bi-trophy-fill'),
        ('diamond-master', 'Diamond Master', 'Achieve perfect scores in 10 assessments', 'standard', 'diamond', 'bi-gem'),
        
        ('iridium-innovator', 'Iridium Innovator', 'Contribute a community project', 'rare', 'iridium', 'bi-award-fill'),
        ('vibranium-visionary', 'Vibranium Visionary', 'Maintain a 100-day streak', 'rare', 'vibranium', 'bi-lightning-charge-fill'),
        ('palladium-pioneer', 'Palladium Pioneer', 'Be among the first 100 users', 'rare', 'palladium', 'bi-award-fill'),
        ('plutonium-powerhouse', 'Plutonium Powerhouse', 'Complete 50 hard challenges', 'rare', 'plutonium', 'bi-radioactive'),
        ('osmium-oracle', 'Osmium Oracle', 'Help 500 other students', 'rare', 'osmium', 'bi-award-fill'),
    ]
    
    print("Seeding achievements...")
    for slug, name, desc, type_, material, icon in achievements:
        await conn.execute("""
            INSERT INTO achievements (slug, name, description, type, material, icon_class)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (slug) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                material = EXCLUDED.material,
                icon_class = EXCLUDED.icon_class
        """, slug, name, desc, type_, material, icon)
        
    print("Seeding complete.")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
