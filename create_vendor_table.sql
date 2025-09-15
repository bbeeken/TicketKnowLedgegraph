-- Create the kg.Vendor table manually
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Create kg.Vendor table
IF OBJECT_ID('kg.Vendor','U') IS NULL
CREATE TABLE kg.Vendor (
  vendor_id INT PRIMARY KEY,
  name NVARCHAR(200) NOT NULL,
  category NVARCHAR(100),
  contact_email NVARCHAR(255),
  contact_phone NVARCHAR(50),
  website NVARCHAR(500),
  notes NVARCHAR(MAX)
) AS NODE;
GO

-- Also seed some vendor data
IF NOT EXISTS (SELECT 1 FROM kg.Vendor WHERE vendor_id = 1001)
  INSERT INTO kg.Vendor(vendor_id,name,category) VALUES (1001,'Acme Equipment','Hardware');
IF NOT EXISTS (SELECT 1 FROM kg.Vendor WHERE vendor_id = 1002)
  INSERT INTO kg.Vendor(vendor_id,name,category) VALUES (1002,'BeanTech Services','Coffee');
IF NOT EXISTS (SELECT 1 FROM kg.Vendor WHERE vendor_id = 1003)
  INSERT INTO kg.Vendor(vendor_id,name,category) VALUES (1003,'NetFlow Systems','Network');
IF NOT EXISTS (SELECT 1 FROM kg.Vendor WHERE vendor_id = 1004)
  INSERT INTO kg.Vendor(vendor_id,name,category) VALUES (1004,'Security Solutions Inc','Security');
IF NOT EXISTS (SELECT 1 FROM kg.Vendor WHERE vendor_id = 1005)
  INSERT INTO kg.Vendor(vendor_id,name,category) VALUES (1005,'HVAC Masters','HVAC');
GO

PRINT 'kg.Vendor table and sample data created successfully.';