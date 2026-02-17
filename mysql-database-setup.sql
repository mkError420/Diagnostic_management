-- MySQL Database Setup Script for Multi-tenant Clinic Management SaaS
-- Run this script to set up the database and initial configuration

-- ========================================
-- DATABASE CREATION
-- ========================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS clinic_management_saas 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create database user
CREATE USER IF NOT EXISTS 'clinic_app'@'localhost' IDENTIFIED BY 'your_secure_password';
CREATE USER IF NOT EXISTS 'clinic_app'@'%' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON clinic_management_saas.* TO 'clinic_app'@'localhost';
GRANT ALL PRIVILEGES ON clinic_management_saas.* TO 'clinic_app'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- ========================================
-- SWITCH TO CLINIC DATABASE
-- ========================================

USE clinic_management_saas;

-- ========================================
-- SECURITY CONFIGURATION
-- ========================================

-- Create backup user
CREATE USER IF NOT EXISTS 'backup_user'@'localhost' IDENTIFIED BY 'backup_password_123';
GRANT SELECT, LOCK TABLES, SHOW VIEW ON clinic_management_saas.* TO 'backup_user'@'localhost';

-- Create readonly user
CREATE USER IF NOT EXISTS 'readonly_user'@'localhost' IDENTIFIED BY 'readonly_password_123';
GRANT SELECT ON clinic_management_saas.* TO 'readonly_user'@'localhost';

-- ========================================
-- PERFORMANCE CONFIGURATION
-- ========================================

-- Enable performance schema for monitoring
UPDATE performance_schema.setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES' 
WHERE NAME LIKE '%statement/%';

UPDATE performance_schema.setup_consumers 
SET ENABLED = 'YES' 
WHERE NAME LIKE '%statements%';

-- ========================================
-- MONITORING AND MAINTENANCE
-- ========================================

-- Create a stored procedure for database health check
DELIMITER //
CREATE PROCEDURE database_health_check()
BEGIN
    SELECT 
        NOW() as timestamp,
        'healthy' as status,
        COUNT(*) as total_tables,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as database_size_mb,
        VERSION() as mysql_version
    FROM information_schema.tables 
    WHERE table_schema = 'clinic_management_saas';
END //
DELIMITER ;

-- Create maintenance procedure
DELIMITER //
CREATE PROCEDURE perform_maintenance()
BEGIN
    -- Optimize tables
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(255);
    DECLARE table_cursor CURSOR FOR 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'clinic_management_saas';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN table_cursor;
    read_loop: LOOP
        FETCH table_cursor INTO table_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET @sql = CONCAT('OPTIMIZE TABLE ', table_name);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE table_cursor;
    
    SELECT 'Maintenance completed successfully' as message;
END //
DELIMITER ;

-- ========================================
-- SAMPLE QUERIES FOR TESTING
-- ========================================

-- Test query to verify database setup
-- SELECT * FROM information_schema.tables WHERE table_schema = 'clinic_management_saas';

-- Test health check procedure
-- CALL database_health_check();

-- Test maintenance procedure
-- CALL perform_maintenance();

-- ========================================
-- NEXT STEPS
-- ========================================

-- 1. Run the migration scripts in order:
--    mysql -u clinic_app -p clinic_management_saas < migrations/001_initial_schema_mysql.sql
--    mysql -u clinic_app -p clinic_management_saas < migrations/002_seed_data_mysql.sql
--    mysql -u clinic_app -p clinic_management_saas < migrations/003_audit_trails_mysql.sql
--    mysql -u clinic_app -p clinic_management_saas < migrations/004_subscriptions_billing_mysql.sql

-- 2. Configure your application with the MySQL connection string:
--    mysql://clinic_app:your_secure_password@localhost:3306/clinic_management_saas

-- 3. Set up automated backups using mysqldump:
--    mysqldump -u backup_user -p clinic_management_saas > backup_$(date +%Y%m%d_%H%M%S).sql

-- 4. Configure monitoring using the health check procedure

-- 5. Set up regular maintenance using the maintenance procedure

-- This setup provides a robust foundation for a multi-tenant
-- clinic management SaaS application using MySQL.
