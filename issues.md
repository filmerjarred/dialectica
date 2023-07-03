issues

#1 - Sometimes the cardStore fails to load with "insufficient permissions"
   - ![](/repos/dialectica/2023-06-07-12-28-45.png)
   
   - I think this happens if the board has just been created and there's a race
      condition on whether or not it's available to the security rules
   
   - The simplest fix in the end was setting up a retry on the load
      but to make this work I had to pass a boolean on suppressing
      reporting the failure to load as an error
