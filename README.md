# Matter-Management-System

 A system where I can add a matter which should have a state(solid/liquid/gas) and an unique id= 1,2,3,4... and name (customizable) . 
 
 1.The matter should be initialised with  gaseous state when created first.
 2. It's state can be updated and the matter can be deleted. 

 # Specifications:
 1.when the matter's state becomes solid(final state) then it's state cannot be updated further or deleted from the DB and it should be written into a flag file(json file).
 # Edge case: 
 1.When I restart the server I should only have matter with solid state in my mongo db database/file 
 2.The intermediate state should be visible of the matter with solid state. 
 3.User should have the power of querying the matter and find out it's state 
 4.the total number of matter of a particular state and total no. of matters. 
 5.Shoul be able to get all matters.
